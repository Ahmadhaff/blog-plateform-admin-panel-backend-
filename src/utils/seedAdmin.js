import User from '../models/User.js';

export const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@blogplateform.com' });
    
    if (existingAdmin) {
      // Admin already exists, skip creation
      console.log('✅ Admin user already exists - skipping creation');
    } else {
      // Create admin user
      const admin = new User({
        username: 'Admin',
        email: 'admin@blogplateform.com',
        password: '12345678', // Will be hashed by pre-save hook
        role: 'Admin',
        verified: true,
        isActive: true
      });

      await admin.save();
      console.log('✅ Admin user created successfully');
      console.log('📝 Admin Credentials:');
      console.log('   Email: admin@blogplateform.com');
      console.log('   Password: 12345678');
      console.log('   Role: Admin');
    }
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    // Don't throw - allow server to continue even if seed fails
  }
};

