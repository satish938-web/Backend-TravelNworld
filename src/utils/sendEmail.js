import nodemailer from "nodemailer";

// ✅ Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Generic sendEmail function
export const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    // console.log("Email sent: " + info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// ✅ Specific function for OTP (for backward compatibility if needed elsewhere)
export const sendOTPEmail = async (email, otp) => {
  const subject = "Your HelloTravel Agent OTP";
  const html = `
      <h2>Welcome to HelloTravel!</h2>
      <p>Your 6-digit verification code is: <strong>${otp}</strong></p>
      <p>This code will expire in 10 minutes.</p>
      <p>Do not share it with anyone.</p>
    `;
  return await sendEmail(email, subject, html);
};

// ✅ Specific function for Enquiries
export const sendEnquiryEmail = async (enquiryData) => {
  const { name, company_name, email, phone, countryCode, location, your_requirements } = enquiryData;
  const subject = `New Business Query from ${name}`;
  const html = `
    <h2>New Business Enquiry Received</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Company:</strong> ${company_name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${countryCode} ${phone}</p>
    <p><strong>Location:</strong> ${location}</p>
    <p><strong>Requirements:</strong></p>
    <p>${your_requirements || "No specific requirements provided."}</p>
    <br>
    <p>Please follow up with the client as soon as possible.</p>
  `;
  
  return await sendEmail(process.env.SUPERADMIN_EMAIL, subject, html);
};

export default sendOTPEmail;
