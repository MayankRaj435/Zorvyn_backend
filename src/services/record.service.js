const RecordModel = require('../models/Record');
const ApiError = require('../utils/ApiError');
const { DEFAULT_PAGE, DEFAULT_LIMIT } = require('../utils/constants');

class RecordService {
  static createRecord(data, createdBy) {
    return RecordModel.create({
      ...data,
      created_by: createdBy,
    });
  }

  static getRecordById(id) {
    const record = RecordModel.findById(id);
    if (!record) {
      throw ApiError.notFound(`Financial record with ID ${id} not found`);
    }
    return record;
  }

  static listRecords(query = {}) {
    const page = query.page || DEFAULT_PAGE;
    const limit = query.limit || DEFAULT_LIMIT;

    const { records, total } = RecordModel.findAll({
      page,
      limit,
      type: query.type,
      category: query.category,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
      sortBy: query.sortBy,
      order: query.order,
    });

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static updateRecord(id, updates) {
    const record = RecordModel.findById(id);
    if (!record) {
      throw ApiError.notFound(`Financial record with ID ${id} not found`);
    }

    return RecordModel.update(id, updates);
  }

  static deleteRecord(id) {
    const record = RecordModel.findById(id);
    if (!record) {
      throw ApiError.notFound(`Financial record with ID ${id} not found`);
    }

    return RecordModel.softDelete(id);
  }
}

module.exports = RecordService;

