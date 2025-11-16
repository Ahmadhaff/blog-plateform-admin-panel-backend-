import Article from '../models/Article.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';

const analyticsController = {
  // Get dashboard analytics
  async getDashboard(req, res) {
    try {
      const [
        totalArticles,
        publishedArticles,
        draftArticles,
        archivedArticles,
        totalUsers,
        activeUsers,
        totalComments,
        totalViewsResult,
        totalLikesResult,
        articlesByStatus,
        articlesByMonth,
        topArticles,
        recentArticles
      ] = await Promise.all([
        Article.countDocuments(),
        Article.countDocuments({ status: 'published' }),
        Article.countDocuments({ status: 'draft' }),
        Article.countDocuments({ status: 'archived' }),
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Comment.countDocuments({ isDeleted: false }),
        Article.aggregate([
          { $group: { _id: null, total: { $sum: '$views' } } }
        ]),
        Article.aggregate([
          { $project: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
          { $group: { _id: null, total: { $sum: '$likesCount' } } }
        ]),
        Article.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Article.aggregate([
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          { $limit: 12 }
        ]),
        Article.find()
          .populate('author', 'username')
          .sort({ views: -1 })
          .limit(5)
          .select('title views likes author createdAt'),
        Article.find()
          .populate('author', 'username')
          .sort({ createdAt: -1 })
          .limit(5)
          .select('title status author createdAt')
      ]);

      return res.json({
        overview: {
          totalArticles,
          publishedArticles,
          draftArticles,
          archivedArticles,
          totalUsers,
          activeUsers,
          totalComments,
          totalViews: totalViewsResult[0]?.total || 0,
          totalLikes: totalLikesResult[0]?.total || 0
        },
        charts: {
          articlesByStatus: articlesByStatus.map(item => ({
            status: item._id,
            count: item.count
          })),
          articlesByMonth: articlesByMonth.map(item => ({
            month: item._id,
            count: item.count
          }))
        },
        topArticles: topArticles.map(article => ({
          id: article._id,
          title: article.title,
          views: article.views,
          likes: article.likes?.length || 0,
          author: article.author?.username || 'Unknown',
          createdAt: article.createdAt
        })),
        recentArticles: recentArticles.map(article => ({
          id: article._id,
          title: article.title,
          status: article.status,
          author: article.author?.username || 'Unknown',
          createdAt: article.createdAt
        }))
      });
    } catch (error) {
      console.error('❌ Error fetching analytics', error);
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  },

  // Get article analytics
  async getArticleAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const matchStage = {};
      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) {
          matchStage.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          matchStage.createdAt.$lte = new Date(endDate);
        }
      }

      const [
        articlesByStatus,
        articlesByMonth,
        topViewedArticles,
        topLikedArticles,
        articlesByAuthor
      ] = await Promise.all([
        Article.aggregate([
          { $match: matchStage },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Article.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              count: { $sum: 1 },
              totalViews: { $sum: '$views' }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        Article.find(matchStage)
          .populate('author', 'username')
          .sort({ views: -1 })
          .limit(10)
          .select('title views likes author createdAt status'),
        Article.find(matchStage)
          .populate('author', 'username')
          .lean()
          .select('title views likes author createdAt status'),
        Article.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: '$author',
              articleCount: { $sum: 1 },
              totalViews: { $sum: '$views' }
            }
          },
          { $sort: { articleCount: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'authorInfo'
            }
          },
          { $unwind: '$authorInfo' },
          {
            $project: {
              authorId: '$_id',
              authorName: '$authorInfo.username',
              authorEmail: '$authorInfo.email',
              articleCount: 1,
              totalViews: 1
            }
          }
        ])
      ]);

      // Sort topLikedArticles by likes count
      const sortedTopLikedArticles = topLikedArticles
        .map(article => ({
          ...article,
          likesCount: Array.isArray(article.likes) ? article.likes.length : 0
        }))
        .sort((a, b) => b.likesCount - a.likesCount)
        .slice(0, 10);

      return res.json({
        articlesByStatus: articlesByStatus.map(item => ({
          status: item._id,
          count: item.count
        })),
        articlesByMonth: articlesByMonth.map(item => ({
          month: item._id,
          count: item.count,
          totalViews: item.totalViews
        })),
        topViewedArticles: topViewedArticles.map(article => ({
          id: article._id,
          title: article.title,
          views: article.views,
          likes: Array.isArray(article.likes) ? article.likes.length : 0,
          author: article.author?.username || 'Unknown',
          status: article.status,
          createdAt: article.createdAt
        })),
        topLikedArticles: sortedTopLikedArticles.map(article => ({
          id: article._id,
          title: article.title,
          views: article.views,
          likes: article.likesCount,
          author: article.author?.username || 'Unknown',
          status: article.status,
          createdAt: article.createdAt
        })),
        articlesByAuthor: articlesByAuthor.map(item => ({
          authorId: item.authorId,
          authorName: item.authorName,
          authorEmail: item.authorEmail,
          articleCount: item.articleCount,
          totalViews: item.totalViews
        }))
      });
    } catch (error) {
      console.error('❌ Error fetching article analytics', error);
      return res.status(500).json({ error: 'Failed to fetch article analytics' });
    }
  }
};

export default analyticsController;

