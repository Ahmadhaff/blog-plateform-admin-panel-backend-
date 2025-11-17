import Article from '../models/Article.js';
import Comment from '../models/Comment.js';
import { deleteFile, getFileStream } from '../config/gridfs.js';

const getBaseUrl = (req) => {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, '');
  }
  
  // In production, always use HTTPS. Check for X-Forwarded-Proto header (from proxies like Render)
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  
  // If host contains 'localhost' or '127.0.0.1', use http (development)
  // Otherwise, use https (production)
  const isLocalhost = host && (host.includes('localhost') || host.includes('127.0.0.1'));
  const isHttps = protocol === 'https' || (!isLocalhost && process.env.NODE_ENV === 'production');
  const finalProtocol = isHttps ? 'https' : 'http';
  
  return `${finalProtocol}://${host}`;
};

const formatArticleResponse = (req, articleDoc) => {
  if (!articleDoc) {
    return null;
  }

  const article = articleDoc.toObject
    ? articleDoc.toObject({ virtuals: true })
    : { ...articleDoc };

  const baseUrl = getBaseUrl(req);
  const imageUrl = article.image?.fileId
    ? `${baseUrl}/api/articles/${article._id ?? article.id}/image`
    : null;

  return {
    id: article._id ?? article.id,
    title: article.title,
    content: article.content,
    tags: Array.isArray(article.tags) ? article.tags : [],
    status: article.status,
    views: article.views ?? 0,
    likesCount: Array.isArray(article.likes) ? article.likes.length : 0,
    commentCount: article.commentCount ?? 0,
    author: article.author,
    image: article.image,
    imageUrl,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt
  };
};

const articleController = {
  // Get all articles with pagination and filters
  async getAll(req, res) {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.status) {
        filter.status = req.query.status;
      }
      if (req.query.authorId) {
        filter.author = req.query.authorId;
      }
      if (req.query.search) {
        filter.$text = { $search: req.query.search };
      }

      const [articles, total] = await Promise.all([
        Article.find(filter)
          .populate('author', 'username email role avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Article.countDocuments(filter)
      ]);

      // Count comments for each article
      const articlesWithCounts = await Promise.all(
        articles.map(async (article) => {
          const commentCount = await Comment.countDocuments({
            article: article._id,
            isDeleted: false
          });
          
          const articleObj = article.toObject ? article.toObject({ virtuals: true }) : { ...article };
          articleObj.commentCount = commentCount;
          
          return articleObj;
        })
      );

      return res.json({
        articles: articlesWithCounts.map((doc) => formatArticleResponse(req, doc)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1
        }
      });
    } catch (error) {
      console.error('❌ Error fetching articles', error);
      return res.status(500).json({ error: 'Failed to fetch articles' });
    }
  },

  // Get article by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      const article = await Article.findById(id)
        .populate('author', 'username email role avatar');

      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }

      const commentCount = await Comment.countDocuments({
        article: article._id,
        isDeleted: false
      });

      const articleObj = article.toObject ? article.toObject({ virtuals: true }) : { ...article };
      articleObj.commentCount = commentCount;

      return res.json({ article: formatArticleResponse(req, articleObj) });
    } catch (error) {
      console.error('❌ Error fetching article by id', error);
      return res.status(500).json({ error: 'Failed to fetch article' });
    }
  },

  // Update article (Admin and Editor can edit any article)
  async update(req, res) {
    try {
      const { id } = req.params;
      const article = await Article.findById(id);

      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }

      const { title, content, tags, status } = req.body;

      if (typeof title !== 'undefined') article.title = title;
      if (typeof content !== 'undefined') article.content = content;
      if (typeof tags !== 'undefined') article.tags = tags;
      if (typeof status !== 'undefined') article.status = status;

      await article.save();
      await article.populate('author', 'username email role avatar');

      return res.json({
        message: 'Article updated successfully',
        article: formatArticleResponse(req, article)
      });
    } catch (error) {
      console.error('❌ Error updating article', error);
      return res.status(500).json({ error: 'Failed to update article' });
    }
  },

  // Delete article (Admin only)
  async delete(req, res) {
    try {
      const { id } = req.params;

      const article = await Article.findById(id);

      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }

      // Delete associated comments
      await Comment.deleteMany({ article: id });

      // Delete image from GridFS if exists
      if (article.image?.fileId) {
        try {
          await deleteFile(article.image.fileId, 'articleImages');
        } catch (fileError) {
          console.error('❌ Error deleting article image:', fileError);
          // Continue with article deletion even if image deletion fails
        }
      }

      await Article.findByIdAndDelete(id);

      return res.json({ message: 'Article and comments deleted successfully' });
    } catch (error) {
      console.error('❌ Error deleting article', error);
      return res.status(500).json({ error: 'Failed to delete article' });
    }
  },

  // Stream article image
  async streamImage(req, res) {
    try {
      const { id } = req.params;
      const article = await Article.findById(id).select('image');

      if (!article || !article.image?.fileId) {
        return res.status(404).json({ error: 'Image not found' });
      }

      const stream = getFileStream(article.image.fileId, 'articleImages');

      res.set('Content-Type', article.image.mimetype || 'application/octet-stream');
      res.set('Cache-Control', 'public, max-age=3600');

      const rawFilename = article.image.filename || 'article-image';
      const safeFilename = rawFilename.replace(/[^\w.\- ]/g, '_');
      res.set('Content-Disposition', `inline; filename="${safeFilename}"`);

      stream.on('error', (error) => {
        console.error('❌ Error streaming article image', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to load image' });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error('❌ Error in streamImage', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream image' });
      }
    }
  }
};

export default articleController;

