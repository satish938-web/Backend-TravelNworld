import { Contact } from "../models/Contact.js";

// Create a new contact inquiry
export const createContactInquiry = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, description } = req.body;
    
    const newContact = await Contact.create({
      firstName,
      lastName,
      phone,
      email,
      description
    });

    res.status(201).json({
      success: true,
      message: "Thank you for contacting us! We will get back to you soon.",
      data: newContact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all contact inquiries (for Admin)
export const getContactInquiries = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a contact inquiry
export const deleteContactInquiry = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: "Inquiry not found" });
    res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
