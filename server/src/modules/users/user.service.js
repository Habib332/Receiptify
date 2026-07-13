const userRepository = require("./user.repository");
const ApiError = require("../../utils/apiError");

// Groups the flat business_users rows into the three role buckets the
// frontend renders as separate stat cards (Owner / Manager / Staff).
// A user can only hold one role per business (business_users PK is
// (business_id, user_id)), so buckets are naturally disjoint — no
// double counting.
function groupBusinessesByRole(rows) {
  const buckets = { owner: [], manager: [], staff: [] };

  for (const row of rows) {
    const entry = {
      business_id: row.business_id,
      name: row.name,
      type: row.type,
      logo_url: row.logo_url,
      receipts_count: row.receipts_count,
    };
    buckets[row.role]?.push(entry);
  }

  return buckets;
}

async function getProfile(userId) {
  const user = await userRepository.findProfileById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const [businessRows, receiptsSubmittedTotal, receiptsByBusiness] =
    await Promise.all([
      userRepository.getUserBusinessesWithReceiptCounts(userId),
      userRepository.getReceiptsSubmittedCount(userId),
      userRepository.getReceiptsSubmittedByBusiness(userId),
    ]);

  const businesses = groupBusinessesByRole(businessRows);

  return {
    user,
    businesses: {
      owner: businesses.owner,
      manager: businesses.manager,
      staff: businesses.staff,
      owner_count: businesses.owner.length,
      manager_count: businesses.manager.length,
      staff_count: businesses.staff.length,
    },
    receipts: {
      submitted_total: receiptsSubmittedTotal,
      by_business: receiptsByBusiness,
    },
  };
}

module.exports = { getProfile };
