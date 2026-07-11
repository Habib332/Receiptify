const businessRepository = require("./business.repository");
const receiptsRepository = require("../receipts/receipts.repository");

async function createBusiness({ userId, name, type, address, phone }) {
  const business = await businessRepository.createBusiness({
    name,
    type,
    address,
    phone,
  });

  await businessRepository.linkUserToBusiness({
    businessId: business.business_id,
    userId,
    role: "owner", // whoever creates a business is always its owner
  });

  return business;
}

// Powers the "Available Businesses" table + search/filter controls.
async function listBusinesses({ search, type } = {}) {
  return businessRepository.getAllBusinesses({ search, type });
}

// Powers the 4 stat cards at the top of the dashboard.
async function getDashboardStats() {
  const [totalBusinesses, types, totalReceipts, mostUsed] = await Promise.all([
    businessRepository.countAllBusinesses(),
    businessRepository.getDistinctBusinessTypes(),
    receiptsRepository.countAllReceipts(),
    receiptsRepository.getMostUsedBusiness(),
  ]);

  return {
    totalBusinesses,
    businessTypes: types.length,
    businessTypesList: types, // handy for the "All Types" filter dropdown too
    totalReceipts,
    mostUsed: mostUsed
      ? {
          businessId: mostUsed.business_id,
          name: mostUsed.name,
          receiptCount: mostUsed.receipt_count,
        }
      : null, // no receipts anywhere yet
  };
}

module.exports = { createBusiness, listBusinesses, getDashboardStats };
