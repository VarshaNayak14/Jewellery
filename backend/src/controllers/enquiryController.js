const Enquiry = require('../models/Enquiry');
const Seller = require('../models/Seller');

// @desc   Submit an enquiry / lead to a business (public — no login required)
// @route  POST /api/v1/enquiries
// @access Public
const createEnquiry = async (req, res) => {
  const { businessId, name, phone, email, message, category, source, location } = req.body;

  if (!businessId || !name || !phone) {
    return res.status(400).json({ success: false, message: 'businessId, name and phone are required' });
  }

  const business = await Seller.findById(businessId);
  if (!business || business.status !== 'approved') {
    return res.status(404).json({ success: false, message: 'Business not found' });
  }

  const enquiry = await Enquiry.create({
    business: businessId,
    user: req.user ? req.user._id : null,
    name,
    phone,
    email,
    message,
    category,
    source: source || 'contact_form',
    location,
  });

  res.status(201).json({ success: true, message: 'Enquiry sent successfully', data: enquiry });
};

// @desc   Get logged-in seller's own leads
// @route  GET /api/v1/enquiries/mine
// @access Private (seller)
const getMyEnquiries = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { business: req.seller._id };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Enquiry.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: enquiries,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
  });
};

// @desc   Seller updates status of one of their leads (new/contacted/closed/spam)
// @route  PUT /api/v1/enquiries/:id/status
// @access Private (seller)
const updateEnquiryStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['new', 'contacted', 'closed', 'spam'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const enquiry = await Enquiry.findOne({ _id: req.params.id, business: req.seller._id });
  if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });

  enquiry.status = status;
  await enquiry.save();

  res.json({ success: true, message: 'Status updated', data: enquiry });
};

// @desc   Admin — view all enquiries across the platform
// @route  GET /api/v1/enquiries/admin/all
// @access Private (admin)
const getAllEnquiriesAdmin = async (req, res) => {
  const { status, businessId, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (businessId) filter.business = businessId;

  const skip = (Number(page) - 1) * Number(limit);
  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter)
      .populate('business', 'shopName shopSlug phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Enquiry.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: enquiries,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
  });
};

module.exports = {
  createEnquiry,
  getMyEnquiries,
  updateEnquiryStatus,
  getAllEnquiriesAdmin,
};