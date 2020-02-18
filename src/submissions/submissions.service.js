import {Injectable} from '@nestjs/common';
import * as admin from 'firebase-admin';

const SCHEMA = 'schema';

const ERROR_NO_RESULTS_FOUND = {error: 'no results found'};

@Injectable()
export default class SubmissionsService {
  constructor(db = admin.firestore()) {
    this.db = db;
  }

  async getSchemaType(schemaType) {
    return await this.db
        .collection(schemaType)
        .doc(SCHEMA)
        .get()
        .then(doc => {
          if (!doc.exists) return ERROR_NO_RESULTS_FOUND;
          return doc.data();
        });
  }

  matchesRequired(schemaElement, submission) {
    if (schemaElement.validation.required && submission[schemaElement.key]) {
      return true;
    }
    return schemaElement.validation.required === false;
  }

  matchesOptions(schemaElement, submissionValue) {
    if (schemaElement.options) {
      let matches = false;
      schemaElement.options.forEach(option => {
        if (option.value === submissionValue) {
          matches = true;
        }
      });
      return matches;
    }
    return true;
  }

  matchesLength(schemaElement, submissionValue) {
    if (schemaElement.validation.maxLength) {
      return submissionValue.length <= schemaElement.validation.maxLength;
    }
    return true;
  }

  matchesPattern(schemaElement, submissionValue) {
    if (schemaElement.validation.pattern) {
      return !!submissionValue.match(schemaElement.validation.pattern);
    }
    return true;
  }

  matchesDate(schemaElement, submissionValue) {
    if (schemaElement.validation.minDate) {
      const submissionValueDate = new Date(submissionValue);
      const schemaMinDate = new Date(schemaElement.validation.minDate);

      if (submissionValueDate <= schemaMinDate) {
        return false;
      }
    }
    return true;
  }

  hasFoundSchema(schema) {
    return !('error' in schema);
  }

  async createSubmission(schemaType, submission) {
    const foundSchema = await this.getSchemaType(schemaType);
    if (!this.hasFoundSchema(foundSchema)) {
      return {error: 'storage unsuccessful'};
    }

    const schema = foundSchema[schemaType];
    let validation = true;

    const failsValidation = () => {
      validation = false;
    };

    for (let i = 0; i < schema.length; i++) {
      if (!validation) break;
      if ('key' in schema[i]) {
        const schemaElement = schema[i];
        const submissionValue = submission[schemaElement.key];
        if (!this.matchesRequired(schemaElement, submission)) failsValidation();
        if (!this.matchesOptions(schemaElement, submissionValue))
          failsValidation();
        if (!this.matchesLength(schemaElement, submissionValue))
          failsValidation();
        if (!this.matchesPattern(schemaElement, submissionValue))
          failsValidation();
        if (!this.matchesDate(schemaElement, submissionValue))
          failsValidation();
      }
    }

    // TODO: post submission to DB

    if (!validation) return {error: 'storage unsuccessful'};
    return {success: 'storage successful'};
  }
}