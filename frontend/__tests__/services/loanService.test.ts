/**
 * Tests pour loanService
 */
import { LoanCreate, LoanStatus } from '../../types/loan';

// Mock axios avant d'importer loanService
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance)
    }
  };
});

// Mock setupAuthInterceptor to do nothing
jest.mock('../../services/api/authInterceptor', () => ({
  setupAuthInterceptor: jest.fn()
}));

import { loanService } from '../../services/loanService';
import axios from 'axios';

// Get references to the mocked axios methods
const mockAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = mockAxios.create() as any;
const mockGet = mockAxiosInstance.get as jest.Mock;
const mockPost = mockAxiosInstance.post as jest.Mock;
const mockPut = mockAxiosInstance.put as jest.Mock;
const mockDelete = mockAxiosInstance.delete as jest.Mock;

describe('loanService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateLoanData', () => {
    it('should validate correct loan data', () => {
      const loanData: LoanCreate = {
        book_id: 1,
        borrower: 1,
        due_date: '2025-12-31',
      };

      const result = loanService.validateLoanData(loanData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject loan without book_id', () => {
      const loanData = {
        borrower: 1,
      } as LoanCreate;

      const result = loanService.validateLoanData(loanData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le livre est obligatoire');
    });

    it('should reject loan without borrower', () => {
      const loanData = {
        book_id: 1,
      } as LoanCreate;

      const result = loanService.validateLoanData(loanData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("L'emprunteur est obligatoire");
    });

    it('should accept borrower as string (new borrower name)', () => {
      const loanData: LoanCreate = {
        book_id: 1,
        borrower: 'Jean Martin',
      };

      const result = loanService.validateLoanData(loanData);

      expect(result.isValid).toBe(true);
    });

    it('should accept borrower as number (existing borrower id)', () => {
      const loanData: LoanCreate = {
        book_id: 1,
        borrower: 123,
      };

      const result = loanService.validateLoanData(loanData);

      expect(result.isValid).toBe(true);
    });

    it('should accept loan without due_date', () => {
      const loanData: LoanCreate = {
        book_id: 1,
        borrower: 1,
      };

      const result = loanService.validateLoanData(loanData);

      expect(result.isValid).toBe(true);
    });

    it('should accept loan with notes', () => {
      const loanData: LoanCreate = {
        book_id: 1,
        borrower: 1,
        notes: 'Prêt de courte durée',
      };

      const result = loanService.validateLoanData(loanData);

      expect(result.isValid).toBe(true);
    });
  });

  describe('createLoan', () => {
    it('should create a loan successfully', async () => {
      const loanData: LoanCreate = {
        book_id: 1,
        borrower: 1,
        due_date: '2025-12-31',
      };

      const mockResponse = {
        data: {
          id: 1,
          book_id: 1,
          borrower_id: 1,
          loan_date: '2025-01-01',
          due_date: '2025-12-31',
          status: LoanStatus.ACTIVE,
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await loanService.createLoan(loanData);

      expect(result).toEqual(mockResponse.data);
      expect(mockPost).toHaveBeenCalledWith('/loans', loanData);
    });

    it('should handle API error when creating loan', async () => {
      const loanData: LoanCreate = {
        book_id: 1,
        borrower: 1,
      };

      const errorResponse = {
        response: {
          status: 400,
          data: { detail: 'Le livre est déjà prêté' },
        },
      };

      mockPost.mockRejectedValue(errorResponse);

      await expect(loanService.createLoan(loanData)).rejects.toEqual(errorResponse);
    });
  });

  describe('returnLoan', () => {
    it('should return a loan successfully', async () => {
      const loanId = 1;

      const mockResponse = {
        data: {
          id: 1,
          status: LoanStatus.RETURNED,
          return_date: '2025-01-15',
        },
      };

      mockPut.mockResolvedValue(mockResponse);

      const result = await loanService.returnLoan(loanId);

      expect(result).toEqual(mockResponse.data);
      expect(mockPut).toHaveBeenCalledWith(`/loans/${loanId}/return`, {});
    });

    it('should handle error when returning already returned loan', async () => {
      const loanId = 1;

      const errorResponse = {
        response: {
          status: 400,
          data: { detail: 'Le livre a déjà été retourné' },
        },
      };

      mockPut.mockRejectedValue(errorResponse);

      await expect(loanService.returnLoan(loanId)).rejects.toEqual(errorResponse);
    });
  });

  describe('getLoans', () => {
    it('should fetch all loans', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            book_id: 1,
            borrower_id: 1,
            status: LoanStatus.ACTIVE,
          },
          {
            id: 2,
            book_id: 2,
            borrower_id: 1,
            status: LoanStatus.RETURNED,
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await loanService.getAllLoans();

      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith('/loans');
    });
  });

  describe('getLoansByBorrower', () => {
    it('should fetch loans for a specific borrower', async () => {
      const borrowerId = 1;

      const mockResponse = {
        data: [
          {
            id: 1,
            book_id: 1,
            borrower_id: 1,
            status: LoanStatus.ACTIVE,
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await loanService.getLoansByBorrower(borrowerId);

      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith(`/loans/by-borrower/${borrowerId}`);
    });
  });

  describe('getStatistics', () => {
    it('should fetch loan statistics', async () => {
      const mockResponse = {
        data: {
          total_loans: 10,
          active_loans: 5,
          overdue_loans: 2,
          returned_loans: 5,
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await loanService.getStatistics();

      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith('/loans/statistics');
    });
  });

  describe('deleteLoan', () => {
    it('should delete a loan successfully', async () => {
      const loanId = 1;

      mockDelete.mockResolvedValue({ status: 204 });

      await loanService.deleteLoan(loanId);

      expect(mockDelete).toHaveBeenCalledWith(`/loans/${loanId}`);
    });
  });

  describe('updateLoan', () => {
    it('should update a loan successfully', async () => {
      const loanId = 1;
      const updateData = {
        due_date: '2025-02-28',
        notes: 'Extension demandée',
      };

      const mockResponse = {
        data: {
          id: 1,
          due_date: '2025-02-28',
          notes: 'Extension demandée',
        },
      };

      mockPut.mockResolvedValue(mockResponse);

      const result = await loanService.updateLoan(loanId, updateData);

      expect(result).toEqual(mockResponse.data);
      expect(mockPut).toHaveBeenCalledWith(`/loans/${loanId}`, updateData);
    });
  });
});
