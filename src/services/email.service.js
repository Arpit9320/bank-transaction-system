const nodemailer = require('nodemailer');
const dns = require("dns").promises;
const net = require("net");



const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

async function testSMTPConnection() {
    try {
        const dnsResult = await dns.lookup("smtp.gmail.com", {
            family: 4
        });

        console.log("Gmail SMTP DNS:", dnsResult);

        const socket = net.createConnection({
            host: "smtp.gmail.com",
            port: 587,
            family: 4,
            timeout: 10000
        });

        socket.on("connect", () => {
            console.log("✅ Gmail SMTP TCP connection successful");
            socket.destroy();
        });

        socket.on("timeout", () => {
            console.error("❌ Gmail SMTP TCP connection TIMEOUT");
            socket.destroy();
        });

        socket.on("error", (error) => {
            console.error("❌ Gmail SMTP TCP connection ERROR:", error);
        });

    } catch (error) {
        console.error("❌ Gmail SMTP DNS ERROR:", error);
    }
}

testSMTPConnection();


// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});


// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Bank-Ledger" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return info
  } catch (error) {
    console.error('Error sending email:', error);
  }
};


async function sendRegisterEmail(username, useremail) {
  
  const subject = "Welcome to the Bank-Ledger!"
  const text = `Hello ${username}, \n\nThank you for registering at Bank Ledger. We're excited to have you on board!\n\nBest Regards,\nThe Bank Ledger Team`;
  const html = `<p>Hello ${username}, </p><p>Thank you for registering at Bank Ledger. We're excited to have you on board!</p><p>Best Regards,<br>The Bank Ledger Team</p>`


  await sendEmail(useremail, subject, text, html)
}


async function sendTransactionEmail(useremail, username, amount, toAccount) {
    const subject = 'Transaction Successful!';
    const text = `Hello ${username},\n\nYour transaction of ₹${amount} to account ${toAccount} was successful.\n\nBest regards,\nThe Backend Ledger Team`;
    const html = `<p>Hello ${username},</p><p>Your transaction of ₹${amount} to account ${toAccount} was successful.</p><p>Best regards,<br>The Backend Ledger Team</p>`;

    await sendEmail(useremail, subject, text, html);
}

async function sendTransactionFailureEmail(userEmail, userName, amount, toAccount) {
    const subject = 'Transaction Failed';
    const text = `Hello ${userName},\n\nWe regret to inform you that your transaction of ₹${amount} to account ${toAccount} has failed. Please try again later.\n\nBest regards,\nThe Backend Ledger Team`;
    const html = `<p>Hello ${userName},</p><p>We regret to inform you that your transaction of ₹${amount} to account ${toAccount} has failed. Please try again later.</p><p>Best regards,<br>The Backend Ledger Team</p>`;

    await sendEmail(userEmail, subject, text, html);
}


module.exports = {
  sendRegisterEmail,
  sendTransactionEmail,
  sendTransactionFailureEmail
};