import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RequestsService {
  localUrl = 'http://0.0.0.0:3000';
  constructor(private http: HttpClient) { }
  getConcurrentRequests(postJson: any): Observable<any>{
    return this.http.post(this.localUrl + '/script', postJson);
  }
}
