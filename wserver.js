const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit'); // For PDF creation

const chromedriverPath = 'C:/webdrivers/chromedriver-win64/chromedriver.exe';  // Update this path

async function captureWhatsAppScreenshots() {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeService(new chrome.ServiceBuilder(chromedriverPath))
        .build();

    try {
        // Maximize the browser window
        await driver.manage().window().maximize();

        // Navigate to WhatsApp Web
        await driver.get('https://web.whatsapp.com/');

        // Increase the timeout for QR code appearance
        console.log("Waiting for QR code to appear and be scanned...");
        try {
            await driver.wait(until.elementLocated(By.css('canvas[aria-label="Scan this QR code to link a device!"]')), 120000); // Increased to 120 seconds
        } catch (e) {
            console.error("QR code did not appear within the timeout.");
            return;
        }

        console.log("QR code found, please scan it.");
        await driver.sleep(30000); // Adjust sleep time as needed to allow for QR code scanning

        // Wait for the main chat list to load
        try {
            await driver.wait(until.elementLocated(By.css('#pane-side')), 180000); // Wait until chat list appears
            console.log("Logged in successfully, capturing screenshots...");
        } catch (e) {
            console.error("Chat list did not load within the timeout.");
            return;
        }

        // Create the directory for screenshots if it doesn't exist
        const screenshotsDir = path.join(__dirname, 'whatsappchats');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir);
        }
        
        
        let chatListSelector = '#pane-side'; // Correct selector for the chat list
let previousHeight = 0;
let currentHeight = await driver.executeScript(`return document.querySelector('${chatListSelector}').scrollHeight`);
let index = 1;

while (previousHeight !== currentHeight) {
    // Take a screenshot of the chat list section
    const screenshotPath = path.join(screenshotsDir, `whatsapp_chat_page_${index}.png`);
    await driver.findElement(By.css(chatListSelector)).takeScreenshot().then(function(image) {
        fs.writeFileSync(screenshotPath, image, 'base64');
    });
    console.log(`Screenshot of chat page ${index} taken`);

    // Scroll down the chat list
    await driver.executeScript(`
        const chatList = document.querySelector('${chatListSelector}');
        chatList.scrollBy(0, 200); // Scroll down by 200 pixels
    `);
    await driver.sleep(2000); // Adjust delay as needed for smoother scrolling and chat loading

    previousHeight = currentHeight;
    currentHeight = await driver.executeScript(`return document.querySelector('${chatListSelector}').scrollHeight`);

    index++;
}


        console.log('Finished capturing all chat screenshots');

        // Convert screenshots to PDF
        convertScreenshotsToPDF(screenshotsDir);

    } finally {
        await driver.quit();
    }
}

function convertScreenshotsToPDF(screenshotsDir) {
    const pdfPath = path.join(__dirname, 'whatsappchats.pdf');

    // Create a new PDF document
    const doc = new PDFDocument({ autoFirstPage: false });
    doc.pipe(fs.createWriteStream(pdfPath));

    // Read all screenshots from the directory
    fs.readdir(screenshotsDir, (err, files) => {
        if (err) throw err;

        files.sort((a, b) => {
            // Sort files numerically
            return parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]);
        }).forEach((file) => {
            const filePath = path.join(screenshotsDir, file);

            // Add each image to the PDF
            doc.addPage()
               .image(filePath, { fit: [600, 800], align: 'center', valign: 'center' });
        });

        doc.end();
        console.log(`PDF created at ${pdfPath}`);
    });
}

captureWhatsAppScreenshots().catch(console.error);
