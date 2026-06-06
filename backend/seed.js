const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
        seedData();
    })
    .catch(err => console.error(err));

const seedData = async () => {
    try {
        // Check if admin exists
        let adminUser = await User.findOne({ 
            $or: [{ email: 'admin@gmail.com' }, { username: 'admin' }] 
        });
        if (!adminUser) {
            adminUser = await User.create({
                name: 'System Admin',
                username: 'admin123',
                email: 'admin@gmail.com',
                password: 'Admin@123',
                role: 'admin'
            });
            console.log('✅ Admin user created successfully!');
            console.log('📧 Email: admin@gmail.com');
            console.log('🔑 Password: Admin@123');
            console.log('👤 Username: admin123');
        } else {
            console.log('⚠️ Admin user already exists');
        }

        // Check if test user exists
        let testUser = await User.findOne({ 
            $or: [{ email: 'testuser@gmail.com' }, { username: 'testuser' }] 
        });
        if (!testUser) {
            testUser = await User.create({
                name: 'Test User',
                username: 'testuser123',
                email: 'testuser@gmail.com',
                password: 'Test@123',
                role: 'user'
            });
            console.log('✅ Test user created successfully!');
            console.log('📧 Email: testuser@gmail.com');
            console.log('🔑 Password: Test@123');
            console.log('👤 Username: testuser123');
        } else {
            console.log('⚠️ Test user already exists');
        }

        process.exit();
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
};
