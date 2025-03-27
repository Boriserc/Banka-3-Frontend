import {Component, inject, OnInit} from '@angular/core';
import { ClientService } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';
import { AccountService } from '../../services/account.service';
import { User } from '../../models/user.model';
import { NewBankAccount } from '../../models/new-bank-account.model';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../models/employee.model';
import {AlertService} from '../../services/alert.service';
import { CompanyService } from '../../services/company.service';
import { Company, CreateCompany } from '../../models/company.model';
import {AuthorizedPersonnel, CreateAuthorizedPersonnel} from '../../models/authorized-personnel.model';
import {AuthorizedPersonnelService} from '../../services/authorized-personnel.service';
import {CardService, CreateCardDto} from '../../services/card.service';
import {ModalComponent} from '../shared/modal/modal.component';
import {ButtonComponent} from '../shared/button/button.component';
import {InputTextComponent} from '../shared/input-text/input-text.component';
// import {NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-account-creation',
  templateUrl: './account-creation.component.html',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ModalComponent,
    ButtonComponent,
    InputTextComponent,
    // NgForOf,
    // NgIf
  ],
  styleUrls: ['./account-creation.component.css']
})
export class AccountCreationComponent implements OnInit {
  loggedInEmployee: Employee | null = null;
  users: User[] = [];
  companyInfo = {
    name: '',
    registrationNumber: '',
    taxNumber: '',
    activityCode: '',
    address: '',
    majorityOwner: ''
  };

  isCurrentAccount = true;
  isCompanyAccount = false;
  employeeId: number | null = null;
  availableCurrencies: string[] = ['RSD'];
  isCurrAdmin: boolean = false;
  showCardModal: boolean = false;

  newCard: CreateCardDto = {
    accountNumber: '',
    name: '',
    type: 'DEBIT',
    issuer: 'VISA',
    cardLimit: 0
  };

  newAccount: NewBankAccount = {
    currency: 'RSD',
    clientId: 0,
    employeeId: 0,
    initialBalance: 0,
    dailyLimit: 0,
    monthlyLimit: 0,
    dailySpending: 0,
    monthlySpending: 0,
    isActive: 'INACTIVE',
    accountType: 'CURRENT',
    accountOwnerType: 'PERSONAL',
    createCard: false,
    monthlyFee: 0,
    name: '',
  };
  //za kompaniju novo
  companies: Company[] = [];
  selectedCompanyId: number | null = null;
  isNewCompany = false;
  loadingCompanies = false;

  //za onog dodatnog
  selectedAuthorizedPersonnelId: number | null = null;
  availablePersonnel: AuthorizedPersonnel[] = [];

  //za personelu takodje
  isNewPersonnel = false;
  newPersonnel: CreateAuthorizedPersonnel = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phoneNumber: '',
    address: '',
    companyId: 0
  };

  constructor(
    private userService: ClientService,
    private authService: AuthService,
    private accountService: AccountService,
    private router: Router,
    private route: ActivatedRoute,
    private employeeService: EmployeeService,
    private alertService: AlertService,
    private companyService: CompanyService,
    private cardService: CardService,
    private authorizedPersonnelService: AuthorizedPersonnelService
  ) {}

  ngOnInit(): void {
    const isAdmin = this.authService.isAdmin();
    const isEmployee = this.authService.isEmployee();
    this.isCurrAdmin = isAdmin;
    if (!(isAdmin || isEmployee)) {
      alert("Access denied. Only employees and admins can create accounts.");
      this.router.navigate(['/']);
      return;
    }

    this.loadUsers();
    // this.loadAvailablePersonnel();
    this.employeeId = this.authService.getUserId();
    if (this.employeeId) {
      this.newAccount.employeeId = this.employeeId;
      if (!this.isCurrAdmin) {
        this.employeeService.getEmployeeSelf().subscribe(
          (employee) => {
            this.loggedInEmployee = employee;
          },
          (error) => {
            console.error('Error fetching employee details:', error);
          }
        );
      }

    }
    this.route.queryParams.subscribe(params => {
      const userId = params['userId'];
      if (userId) {
        this.newAccount.clientId = +userId; // preselect
        if (this.isCompanyAccount) this.loadCompaniesForClient(); //preload i za kompanije ako treba
      }
    });
    // this.loadUsers();
    // this.onAccountTypeChange();
  }

  navigateToRegisterUser() {
    this.router.navigate(['/register-user'], { queryParams: { redirect: 'current-account' } });
  }

  loadUsers() {
    this.userService.getAllUsers(0, 100).subscribe({
      next: (response) => {
        this.users = response.content;
      },
      error: (error) => console.error('Failed to load users:', error)
    });
  }
  private loadAvailablePersonnel(companyId: number): void {
    this.authorizedPersonnelService.getByCompany(companyId).subscribe({
      next: (personnel) => {
        this.availablePersonnel = personnel;
      },
      error: (error) => console.error('Failed to load personnel:', error)
    });
  }

  onAccountOwnerTypeChange() {
    this.isCompanyAccount = this.newAccount.accountOwnerType === 'COMPANY';
    if (this.isCompanyAccount && this.newAccount.clientId) {
      this.loadCompaniesForClient();
    }
    if (!this.isCompanyAccount) {
      this.newAccount.companyId = undefined;
      this.selectedCompanyId = null;
      this.isNewCompany = false;
    }
  }

  toggleIsActive() {
    this.newAccount.isActive = this.newAccount.isActive === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }
  toggleCreateCard() {
    this.newAccount.createCard = !this.newAccount.createCard;
  }

  isCompanyFormValid(): boolean {
    if (!this.isCompanyAccount) return true;

    // Existing company val
    if (!this.isNewCompany && !this.selectedCompanyId) return false;

    // New company val
    if (this.isNewCompany) {
      const companyValid = this.companyInfo.name.trim() !== '' &&
        this.companyInfo.registrationNumber.trim() !== '' &&
        this.companyInfo.taxNumber.trim() !== '' &&
        this.companyInfo.activityCode.trim() !== '' &&
        this.companyInfo.address.trim() !== '';

      if (!companyValid) return false;
    }

    // New personnel val
    if (this.isNewPersonnel) {
      const personnelValid = this.newPersonnel.firstName.trim() !== '' &&
        this.newPersonnel.lastName.trim() !== '' &&
        this.newPersonnel.dateOfBirth !== '' &&
        this.newPersonnel.gender !== '' &&
        this.newPersonnel.email.trim() !== '' &&
        this.newPersonnel.phoneNumber.trim() !== '' &&
        this.newPersonnel.address.trim() !== '';

      if (!personnelValid) return false;
    }

    return true;
  }

  //todo novo za kompanije

  onClientChange() {
    if (this.newAccount.clientId && this.isCompanyAccount) {
      this.loadCompaniesForClient();
    }
  }

  private loadCompaniesForClient() {
    this.loadingCompanies = true;
    this.companyService.getCompaniesByClientId(this.newAccount.clientId!).subscribe({
      next: (companies) => {
        this.companies = companies;
        this.loadingCompanies = false;
      },
      error: (error) => {
        console.error('Error loading companies:', error);
        this.loadingCompanies = false;
      }
    });
  }

  onCompanySelect() {
    if (this.selectedCompanyId === -1) { // Create new company selektovano
      // alert("dakle jes -1, sto onda nisu slobodna polja");
      this.isNewCompany = true;
      this.resetCompanyForm();
      this.availablePersonnel = [];
    } else {
      // alert("ne registruje da je isto?");
      this.isNewCompany = false;
      const selectedCompany = this.companies.find(c => c.id === Number(this.selectedCompanyId));
      if (selectedCompany) {
        this.populateCompanyForm(selectedCompany);
        this.loadAvailablePersonnel(selectedCompany.id);
      } else {
        // alert("NITI OVDE");
        this.resetCompanyForm();
        this.availablePersonnel = [];
      }
    }
    this.isNewPersonnel = false;
    this.selectedAuthorizedPersonnelId = null;
  }

  onPersonnelSelect() {
    this.isNewPersonnel = this.selectedAuthorizedPersonnelId === -1;
    if (!this.isNewPersonnel) {
      this.newPersonnel = {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        email: '',
        phoneNumber: '',
        address: '',
        companyId: 0
      };
    }
  }

  private populateCompanyForm(company: Company) {
    this.companyInfo = {
      name: company.name,
      registrationNumber: company.registrationNumber,
      taxNumber: company.taxId,
      activityCode: company.activityCode,
      address: company.address,
      // majorityOwner: company.majorityOwner.toString()
      majorityOwner: this.newAccount.clientId.toString()
    };
  }

  private resetCompanyForm() {
    this.companyInfo = {
      name: '',
      registrationNumber: '',
      taxNumber: '',
      activityCode: '',
      address: '',
      majorityOwner: ''
    };
  }

  private formatDate(date: Date): string {
    const isoString = new Date(date).toISOString();
    return isoString.split('T')[0];
  }

  getClientName(clientId: number): string {
    const client = this.users.find(u => u.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown';
  }

  async onSubmit() {
    //nov
    try {
      let companyId: number | undefined;
      let authorizedPersonId: number | undefined;

      if (this.isCompanyAccount) {
        // create if new
        if (this.isNewCompany) {
          const createCompanyDto: CreateCompany = {
            name: this.companyInfo.name,
            registrationNumber: this.companyInfo.registrationNumber,
            taxId: this.companyInfo.taxNumber,
            activityCode: this.companyInfo.activityCode,
            address: this.companyInfo.address,
            majorityOwner: this.newAccount.clientId
          };
          //za err hendl
          try {
            const newCompany = await this.companyService.createCompany(createCompanyDto).toPromise();
            if (newCompany && 'id' in newCompany) {
              companyId = newCompany.id;
            }
          } catch (error: any) {

            const errorMessage = error?.error?.message || 'Failed to create company (try different tax number or registration number';
            this.alertService.showAlert('error', errorMessage);
            return;
          }

        } else {
          companyId = this.selectedCompanyId || undefined;
        }
        //todo odavde valjda

        if (this.isNewPersonnel && companyId) {
          const createPersonnelDto: CreateAuthorizedPersonnel = {
            ...this.newPersonnel,
            companyId: companyId
          };

          try {
            const createdPersonnel = await this.authorizedPersonnelService.createAuthorizedPersonnel(createPersonnelDto).toPromise();
            if (createdPersonnel && 'id' in createdPersonnel) {
              authorizedPersonId = createdPersonnel.id;
            }
          } catch (error: any) {
            const errorMessage = error?.error?.message || 'Failed to create authorized personnel';
            this.alertService.showAlert('error', errorMessage);
            return;
          }
        } else if (this.selectedAuthorizedPersonnelId) {
          // da koristi postojeceg
          authorizedPersonId = this.selectedAuthorizedPersonnelId;
        }
      }

      this.newAccount.companyId = companyId;
      this.newAccount.authorizedPersonId = authorizedPersonId;

      this.accountService.createCurrentAccount(this.newAccount).subscribe({
        next: (createdAccount) => {
          if (this.newAccount.createCard) {
            this.newCard.accountNumber = createdAccount.accountNumber;
            this.showCardModal = true;
          } else {
            this.alertService.showAlert('success', 'Account created successfully!');
            // this.router.navigate(['/client-portal']);
            this.router.navigate(['/success'], {
              state: {
                title: 'Account Created!',
                message: 'The account has been successfully created.',
                buttonName: 'Go to Client Portal',
                continuePath: '/client-portal'
              }
            });
          }
        },
        error: (error) => {
          console.error('Failed to create account:', error);
          this.alertService.showAlert('error', 'Failed to create account');
        }
      });

    } catch (error) {
      console.error('Error creating company:', error);
      this.alertService.showAlert('error', 'Failed to create company');
    }
  }

  submitCardForm(): void {
    const request = this.authService.isClient()
      ? this.cardService.requestCard(this.newCard)
      : this.cardService.createCard(this.newCard);

    request.subscribe({
      next: () => {
        this.showCardModal = false;
        this.router.navigate(['/success'], {
          state: {
            title: 'Card Created!',
            message: 'The card has been successfully created.',
            buttonName: 'Go to Account',
            continuePath: `/account/${this.newCard.accountNumber}`
          }
        });
      },
      error: (err) => {
        this.alertService.showAlert('error', 'Failed to create card.');
        console.error(err);
      }
    });
  }

}
