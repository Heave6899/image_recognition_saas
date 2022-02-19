import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-download-pop-up',
  templateUrl: './download-pop-up.component.html',
  styleUrls: ['./download-pop-up.component.css']
})
export class DownloadPopUpComponent {
  file: any;
  reqNumber = new FormControl('', [Validators.required, Validators.max(100), Validators.min(2)]);
  concurrent = false;
  constructor(
    public dialogRef: MatDialogRef<DownloadPopUpComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}
  select_file(fileInputEvent: any) {
    console.log(fileInputEvent.target.files[0]);
    this.file = fileInputEvent.target.files[0]
  }
  upload(){
    return this.file
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  concurrentReq(){
    return this.reqNumber.value
  }
}
