const publicProductVisibilityQuery = (extra = {}) => {
  const filter = { ...extra };
  const clauses = Array.isArray(filter.$and) ? [...filter.$and] : [];

  clauses.push({
    $or: [
      { isActive: true },
      { isActive: { $exists: false } },
      { isActive: null },
    ],
  });

  clauses.push({
    $or: [
      { approvalStatus: 'approved' },
      { approvalStatus: { $exists: false } },
      { approvalStatus: null },
      { approvalStatus: '' },
    ],
  });

  filter.$and = clauses;
  return filter;
};

module.exports = { publicProductVisibilityQuery };
