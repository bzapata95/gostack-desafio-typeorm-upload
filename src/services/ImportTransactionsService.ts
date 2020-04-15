import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';

import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import CreateTransactionService from './CreateTransactionService';

interface Request {
  importFilename: string;
}
class ImportTransactionsService {
  async execute({ importFilename }: Request): Promise<Transaction[]> {
    const pathCsv = path.join(uploadConfig.directory, importFilename);
    const createTransaction = new CreateTransactionService();

    const request = await new Promise<Transaction[]>((resolve, reject) => {
      const Arraytransactions: Transaction[] = [];
      fs.createReadStream(pathCsv)
        .pipe(csvParse({ delimiter: ',', columns: true, trim: true }))
        .on('data', async data => {
          Arraytransactions.push(data);
        })
        .on('error', () => reject)
        .on('end', () => {
          resolve(Arraytransactions);
        });
    });

    const total = await request;

    async function getTransactions(
      totals: Array<Record<string, any>>,
    ): Promise<Transaction[]> {
      const results: Transaction[] = [];

      /* eslint-disable no-await-in-loop */
      /* eslint-disable no-restricted-syntax */
      for (const data of totals) {
        const transaction = await createTransaction.execute({
          title: data.title,
          type: data.type,
          value: data.value,
          category: data.category,
        });
        results.push(transaction);
      }
      /* eslint-disable no-await-in-loop */
      /* eslint-disable no-restricted-syntax */

      return Promise.all(results);
    }

    const transactions = await getTransactions(total);

    return transactions;
  }
}

export default ImportTransactionsService;
