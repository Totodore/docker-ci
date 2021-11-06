import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent {

  public password?: string;

  constructor(
    private readonly http: HttpClient,
    private readonly snackbar: MatSnackBar,
  ) { }

  public async submit(e: Event) {
    e.preventDefault();
    if (this.password) {
      try {
        const { token } = await this.http.post<AuthRes>(environment.production ? '/api/auth' : 'http://localhost:8081/api/auth', { password: this.password }).toPromise();
        if (token) {
          localStorage.setItem('token', token);
          this.snackbar.open('Login successful');
        } else {
          this.snackbar.open('Error while authenticating', '', { duration: 2000 });
        }
      } catch (e) {
        if (e instanceof HttpErrorResponse) {
          if (e.status === 401) {
            this.snackbar.open("Bad password", "", { duration: 2000 });
          } else 
            this.snackbar.open('Error while authenticating', '', { duration: 2000 });
        } else
          this.snackbar.open('Error while authenticating', '', { duration: 2000 });
        console.error(e);
      }
    }
  }

}

type AuthRes = {
  token: string;
}