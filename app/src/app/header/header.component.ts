import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  public get logged() { return localStorage.getItem('token') !== null; }
  
  public logout() {
    localStorage.removeItem('token');
  }

}
