import { getCustomRepository, In, getRepository } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';

import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import uploadConfig from '../config/upload';

interface Request {
  importFilename: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsService {
  async execute({ importFilename }: Request): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionRepository = getCustomRepository(TransactionRepository);

    const pathCsv = path.join(uploadConfig.directory, importFilename);

    const contactsReadStream = fs.createReadStream(pathCsv);

    const parsers = csvParse({ delimiter: ',', columns: true, trim: true });

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    const parseCSV = contactsReadStream.pipe(parsers);

    parseCSV.on('data', async line => {
      const { title, type, value, category } = line;

      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoyTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoyTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(pathCsv);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
