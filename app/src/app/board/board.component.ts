import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Container } from '@angular/compiler/src/i18n/i18n_ast';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss']
})
export class BoardComponent implements OnInit {

  public containerData: ContainerInfo[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly snackbar: MatSnackBar,
  ) { }

  public async ngOnInit() {
    try {
      this.containerData = await this.http.get<ContainerInfo[]>(environment.production ? '/api/' : 'http://localhost:8081/api/').toPromise();
    } catch (e) {
      console.error(e);
      localStorage.removeItem('token');
    }
  }

  public normalizeContainerNames(name: string) {
    return name.replace(/\//g, '');
  }

  public async update(el: ContainerInfo) {
    el.isUpdating = true;
    try {
      await this.http.get(environment.production ? '/hooks' + el.Names[0] : 'http://localhost:8081/hooks' + el.Names[0]).toPromise();
    } catch (e) {
      if ((e as HttpErrorResponse).status < 300)
        return;
      this.snackbar.open(`Error updating ${this.normalizeContainerNames(el.Names[0])}`, 'Close', { duration: 5000 });
      console.error(e);
    } finally {
      el.isUpdating = false;
    }
  }

}
type ContainerInfo = {
  Names: string[];
  Id: string;
  isUpdating: boolean;
}
