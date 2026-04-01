const RecordModel = require('../models/Record');

class DashboardService {
  static getSummary() {
    return RecordModel.getSummary();
  }

  static getCategoryTotals(type) {
    return RecordModel.getCategoryTotals(type);
  }

  static getTrends(period = 'monthly', count = 12) {
    if (period === 'weekly') {
      return RecordModel.getWeeklyTrends(count);
    }
    return RecordModel.getMonthlyTrends(count);
  }

  static getRecentActivity(limit = 10) {
    return RecordModel.getRecentActivity(limit);
  }
}

module.exports = DashboardService;

