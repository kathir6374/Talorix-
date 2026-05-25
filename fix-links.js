const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log("Starting Link Maintenance (LH3 Migration)...");

    try {
        // Fix Users
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { avatar_url: { contains: 'drive.google.com' } },
                    { resume_url: { contains: 'drive.google.com' } },
                    { company_logo_url: { contains: 'drive.google.com' } }
                ]
            }
        });

        console.log(`Checking ${users.length} User records...`);
        for (const user of users) {
            const updateData = {};

            // Fix Avatar (Image)
            if (user.avatar_url?.includes('drive.google.com')) {
                const fileId = user.avatar_url.split('id=')[1]?.split('&')[0];
                if (fileId) updateData.avatar_url = `https://lh3.googleusercontent.com/d/${fileId}=s1000`;
            } else if (user.avatar_url?.includes('lh3.googleusercontent.com') && !user.avatar_url.includes('=s')) {
                updateData.avatar_url = user.avatar_url + '=s1000';
            }

            // Fix Resume (Download)
            if (user.resume_url?.includes('drive.google.com')) {
                const fileId = user.resume_url.split('id=')[1]?.split('&')[0];
                if (fileId) updateData.resume_url = `https://drive.google.com/uc?id=${fileId}&export=download`;
            }

            // Fix Company Logo (Image)
            if (user.company_logo_url?.includes('drive.google.com')) {
                const fileId = user.company_logo_url.split('id=')[1]?.split('&')[0];
                if (fileId) updateData.company_logo_url = `https://lh3.googleusercontent.com/d/${fileId}=s1000`;
            } else if (user.company_logo_url?.includes('lh3.googleusercontent.com') && !user.company_logo_url.includes('=s')) {
                updateData.company_logo_url = user.company_logo_url + '=s1000';
            }

            if (Object.keys(updateData).length > 0) {
                console.log(`Updating user: ${user.id}`);
                await prisma.user.update({ where: { id: user.id }, data: updateData });
            }
        }

        // Fix Posts
        const posts = await prisma.post.findMany({
            where: {
                OR: [
                    { image_url: { contains: 'drive.google.com' } },
                    { video_url: { contains: 'drive.google.com' } }
                ]
            }
        });

        console.log(`Checking ${posts.length} Post records...`);
        for (const post of posts) {
            const updateData = {};

            // Fix Post Image (Image)
            if (post.image_url?.includes('drive.google.com')) {
                const fileId = post.image_url.split('id=')[1]?.split('&')[0];
                if (fileId) updateData.image_url = `https://lh3.googleusercontent.com/d/${fileId}=s1000`;
            } else if (post.image_url?.includes('lh3.googleusercontent.com') && !post.image_url.includes('=s')) {
                updateData.image_url = post.image_url + '=s1000';
            }

            // Fix Post Video (Download/Direct)
            if (post.video_url?.includes('drive.google.com')) {
                const fileId = post.video_url.split('id=')[1]?.split('&')[0];
                if (fileId) updateData.video_url = `https://drive.google.com/uc?id=${fileId}&export=download`;
            }

            if (Object.keys(updateData).length > 0) {
                console.log(`Updating post: ${post.id}`);
                await prisma.post.update({ where: { id: post.id }, data: updateData });
            }
        }

        console.log("Maintenance Complete successfully.");
    } catch (err) {
        console.error("Maintenance Failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

fix();
