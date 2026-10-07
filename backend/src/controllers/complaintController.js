const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');

// USER: Submit complaint
exports.createComplaint = async (req, res) => {
  const { orderId, productId, sellerId, category, description, images, videos } = req.body;
  const complaint = await Complaint.create({
    user: req.user._id,
    order: orderId,
    product: productId,
    seller: sellerId,
    category,
    description,
    images: images || [],
    videos: videos || [],
  });

  await Notification.create({
    title: 'New Complaint',
    message: `User submitted a complaint: ${category.replace(/_/g, ' ')}`,
    type: 'push',
    targetRole: 'admin',
  });

  res.status(201).json({ success: true, complaint });
};

// USER: Get my complaints
exports.getMyComplaints = async (req, res) => {
  const complaints = await Complaint.find({ user: req.user._id })
    .sort('-createdAt')
    .populate('order', 'orderNumber')
    .populate('product', 'name images');
  res.json({ success: true, complaints });
};

// ADMIN: Get all complaints
exports.getAllComplaints = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = status ? { status } : {};
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [complaints, total] = await Promise.all([
    Complaint.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit))
      .populate('user', 'name email')
      .populate('order', 'orderNumber')
      .populate('product', 'name'),
    Complaint.countDocuments(query),
  ]);
  res.json({ success: true, complaints, total });
};

// ADMIN: Update complaint
exports.updateComplaint = async (req, res) => {
  const { status, resolution, adminNotes } = req.body;
  const complaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    { status, resolution, adminNotes },
    { new: true }
  );
  if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
  res.json({ success: true, complaint });
};
