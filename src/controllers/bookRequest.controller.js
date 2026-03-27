const BookRequest = require("../models/bookRequest.models");
const { sendEmail, bookRequestStatusTemplate } = require("../services/email.service");

// Create a new request
const createRequest = async (req, res) => {
    try {
        const { title, author, section, description, isSeries, seriesName } = req.body;
        const request = await BookRequest.create({
            title, author, section, description, isSeries, seriesName,
            userId: req.user._id
        });
        res.status(201).json({ success: true, data: request });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all requests (Admin only)
const getAllRequests = async (req, res) => {
    try {
        const requests = await BookRequest.find()
            .populate("userId", "name email")
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update request status (Admin only)
const updateRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;

        // populate لجلب إيميل المستخدم
        const request = await BookRequest.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).populate("userId", "name email");

        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        // إرسال إيميل للمستخدم عند تغيير الحالة
        if (["approved", "fulfilled", "rejected"].includes(status)) {
            const template = bookRequestStatusTemplate(status, request.title);
            await sendEmail({ to: request.userId.email, ...template });
        }

        res.status(200).json({ success: true, data: request });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete a request (Admin only)
const deleteRequest = async (req, res) => {
    try {
        const request = await BookRequest.findByIdAndDelete(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }
        res.status(200).json({ success: true, message: "Request deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createRequest, getAllRequests, updateRequestStatus, deleteRequest };