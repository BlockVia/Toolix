const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://asfourmohmed45_db_user:lcTphcrgObU2a8ZG@cluster0.jnefqc2.mongodb.net/toolix?retryWrites=true&w=majority&appName=Cluster0';

async function createAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const email = 'admin@toolix.fun';
        const password = 'T00l!x$Admin_2026_Secure#';

        let admin = await User.findOne({ email });

        if (admin) {
            console.log('Admin already exists, updating password and role...');
            admin.password_hash = password;
            admin.role = 'admin';
            admin.is_developer = true;
            await admin.save();
        } else {
            console.log('Creating new admin...');
            admin = new User({
                username: 'ToolixAdmin',
                email: email,
                password_hash: password,
                role: 'admin',
                is_developer: true
            });
            await admin.save();
        }

        console.log('\n--- ADMIN CREDENTIALS ---');
        console.log('Email:    ' + email);
        console.log('Password: ' + password);
        console.log('-------------------------\n');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

createAdmin();
