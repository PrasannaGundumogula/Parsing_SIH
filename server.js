const express = require('express');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();
const port = 3000; // You can change this to any port you prefer
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use('/captured_data', express.static(path.join(__dirname, 'public', 'captured_data')));

app.post('/capture-instagram', async (req, res) => {
    const { username, password } = req.body;
    const outputDir = path.join(__dirname, 'public', 'captured_data');

    console.log(`Received request to capture Instagram data for username: ${username}`);

    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir);
        console.log(`Created directory: ${outputDir}`);
    }

    try {
        const browser = await puppeteer.launch({
            executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
            headless: false
        });
        const page = await browser.newPage();

        await page.setDefaultNavigationTimeout(60000);
        console.log('Navigating to Instagram login page...');
        await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle0' });

        await page.waitForSelector('input[name="username"]');
        await page.type('input[name="username"]', username);
        await page.type('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        console.log(`Logged in as ${username}. Navigating to user profile...`);
        await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle0' });

        let previousHeight;
        console.log('Scrolling through the posts...');
        while (true) {
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await new Promise(resolve => setTimeout(resolve, 2000));
            let newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === previousHeight) break;
        }

        const allPostsPath = path.join(outputDir, 'instagram_all_posts.png');
        await page.screenshot({ path: allPostsPath, fullPage: true });
        console.log('Captured screenshot of all posts.');

        await page.click('a[href*="/followers/"]');
        await new Promise(resolve => setTimeout(resolve, 5000));

        const followersModalSelector = 'div[role="dialog"] ul';
        let previousFollowersHeight;
        let maxFollowersToCapture = 10;
        let totalFollowersCaptured = 0;

        console.log('Scrolling through the followers list...');
        while (totalFollowersCaptured < maxFollowersToCapture) {
            previousFollowersHeight = await page.evaluate(() => document.querySelector('div[role="dialog"]').scrollHeight);
            await page.evaluate(() => document.querySelector('div[role="dialog"]').scrollBy(0, 1000));
            await new Promise(resolve => setTimeout(resolve, 2000));
            let newFollowersHeight = await page.evaluate(() => document.querySelector('div[role="dialog"]').scrollHeight);

            const followersPartPath = path.join(outputDir, `instagram_followers_part${totalFollowersCaptured + 1}.png`);
            await page.screenshot({
                path: followersPartPath,
                clip: {
                    x: 0,
                    y: 0,
                    width: 400,
                    height: 1000
                }
            });

            totalFollowersCaptured += 1;

            if (newFollowersHeight === previousFollowersHeight) break;
        }

        await browser.close();
        console.log('Browser closed. Data capture complete.');

        res.send(`
            <h1>Data Capture Complete</h1>
            <h2>All Posts Screenshot</h2>
            <img src="/captured_data/instagram_all_posts.png" alt="All Posts Screenshot">
            <h2>Followers Screenshot</h2>
            <img src="/captured_data/instagram_followers_part1.png" alt="Followers Screenshot">
        `);
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send('An error occurred.');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
