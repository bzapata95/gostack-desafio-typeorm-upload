import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const income = transactions.reduce(
      (acc: number, { type, value }: Transaction) => {
        if (type === 'income') {
          return acc + value;
        }
        return acc;
      },
      0,
    );

    const outcome = transactions.reduce(
      (acc: number, { type, value }: Transaction) => {
        if (type === 'outcome') {
          return acc + value;
        }
        return acc;
      },
      0,
    );

    const balance = {
      income,
      outcome,
      total: income - outcome,
    };
    return balance;
  }
}

export default TransactionsRepository;
