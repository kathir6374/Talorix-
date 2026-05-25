import { sendEmail } from "./src/lib/email.js";

async function testEmail() {
  console.log("Testing email...");
  const result = await sendEmail({
    to: "test@example.com",
    subject: "Talorix Test Email",
    html: "<h1>It works!</h1>"
  });
  
  if (result) {
    console.log("Email sent successfully via Resend API!");
  } else {
    console.log("Email fell back to console logging. Check if RESEND_API_KEY is configured.");
  }
}

testEmail();
