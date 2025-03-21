import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoanRequest, LoanRequestStatus } from '../models/loan-request.model';
import { AuthService } from './auth.service';
import { Currency } from '../models/currency.model';
import {Loan} from '../models/loan-dto.model';

@Injectable({
  providedIn: 'root',
})
export class LoanRequestService {
  private apiUrl = 'http://localhost:8082/api/loan-requests';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // submitLoanRequest(request: LoanRequest): Observable<LoanRequest> {
  //   return this.http.post<LoanRequest>(this.apiUrl, request, {
  //     headers: this.getAuthHeaders(),
  //   });
  // }
  submitLoanRequest(request: LoanRequest): Observable<string> {
    return this.http.post(this.apiUrl, request, {
      headers: this.getAuthHeaders(),
      responseType: 'text' // jer vracaju samo string :))
    });
  }

  getLoanRequestsByStatus(status: LoanRequestStatus): Observable<LoanRequest[]> {
    return this.http.get<LoanRequest[]>(`${this.apiUrl}/status/${status}`, {
      headers: this.getAuthHeaders(),
    });
  }

  getClientLoanRequests(): Observable<{ content: Loan[] }> {
    return this.http.get<{ content: Loan[] }>(`${this.apiUrl}`, {
      headers: this.getAuthHeaders(),
    });
  }

  getAllLoanRequests(): Observable<{ content: LoanRequest[] }> {
    return this.http.get<{ content: LoanRequest[] }>(`${this.apiUrl}/all`, {
      headers: this.getAuthHeaders(),
    });
  }

  approveLoanRequest(loanId: number): Observable<any> {
    console.log(`Sending loan approval request ${loanId}`);
    return this.http.put(`${this.apiUrl}/approve/${loanId}`, null, {
      headers: this.getAuthHeaders(),
    });
  }

  rejectLoanRequest(loanId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/reject/${loanId}`, null, {
      headers: this.getAuthHeaders(),
    });
  }

  getAvailableCurrencies(): Currency[] {
    return [
      { code: 'RSD', name: 'Serbian Dinar', symbol: 'RSD', country: ['Serbia'], description: 'Serbian Dinar', isActive: true },
      { code: 'EUR', name: 'Euro', symbol: '€', country: ['Germany', 'Slovenia', 'Other EU'], description: 'Euro', isActive: true },
      { code: 'USD', name: 'US Dollar', symbol: '$', country: ['USA'], description: 'US Dollar', isActive: true },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', country: ['Switzerland'], description: 'Swiss Franc', isActive: true },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: ['Japan'], description: 'Japanese Yen', isActive: true },
      { code: 'GBP', name: 'British Pound', symbol: '£', country: ['United Kingdom'], description: 'British Pound', isActive: true },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', country: ['Canada'], description: 'Canadian Dollar', isActive: true },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: ['Australia'], description: 'Australian Dollar', isActive: true }
    ];
  }

}
