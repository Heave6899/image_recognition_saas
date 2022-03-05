import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand, } from '@aws-sdk/client-sqs';
import { DownloadPopUpComponent } from './components/download-pop-up/download-pop-up.component';
import * as AWS from 'aws-sdk';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { filter, Subject, takeUntil } from 'rxjs';
import { Guid } from 'guid-typescript';
import {RequestsService} from './service/requests.service'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit, OnDestroy {
  breakpoint: any;
  destroyed = new Subject<void>();
  outputs: string = "";
  mainGrid = new Map([
    [Breakpoints.XSmall, 1],
    [Breakpoints.Small, 1],
    [Breakpoints.Medium, 2],
    [Breakpoints.Large, 4],
    [Breakpoints.XLarge, 4],
  ]);
  subGrid = new Map([
    [Breakpoints.XSmall, 1],
    [Breakpoints.Small, 2],
    [Breakpoints.Medium, 1],
    [Breakpoints.Large, 2],
    [Breakpoints.XLarge, 2],
  ]);
  subGridRows = new Map([
    [Breakpoints.XSmall, 10],
    [Breakpoints.Small, 8],
    [Breakpoints.Medium, 14],
    [Breakpoints.Large, 10],
    [Breakpoints.XLarge, 10],
  ]);
  mainGridCols = 4;
  subGridCols = 2;
  rowsSubGridCols = 9;
  grid: any = []
  REGION = "us-east-1";
  BUCKET_NAME = "cloudcomputinginputs"
  queue_url = 'https://sqs.us-east-1.amazonaws.com/161689885677/RequestQueue'
  credentials = {
    accessKeyId: 'AKIASLJLX3PW7QJ4F5OU',
    secretAccessKey: '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'
  }
  reader = new FileReader();
  sqsClient = new SQSClient({ credentials: this.credentials, region: this.REGION });
  s3Client = new AWS.S3({ credentials: this.credentials, region: this.REGION })
  sessionID: any;
  scroll: boolean = false;

  constructor(public dialog: MatDialog, breakpointObserver: BreakpointObserver, private requests: RequestsService) {
    breakpointObserver
      .observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge,
      ])
      .pipe(takeUntil(this.destroyed))
      .subscribe(result => {
        for (const query of Object.keys(result.breakpoints)) {
          if (result.breakpoints[query]) {
            this.mainGridCols = this.mainGrid.get(query) ?? 4;
            this.subGridCols = this.subGrid.get(query) ?? 2;
            this.rowsSubGridCols = this.subGridRows.get(query) ?? 2;
            console.log(this.mainGridCols, this.subGridCols)
          }
        }
      });

    localStorage.getItem('sessionID') ? (this.sessionID = localStorage.getItem("sessionID")) : (this.sessionID = Guid.create())
    localStorage.setItem('sessionID', this.sessionID)
    setInterval(this.download_message.bind(this), 8000, this.sqsClient, this.queue_url, this.sessionID, this.outputs, this.grid);
  }

  // grid: any = [
  //   {
  //     "imageSrc": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMAEAsMDgwKEA4NDhIREBMYKBoYFhYYMSMlHSg6Mz08OTM4N0BIXE5ARFdFNzhQbVFXX2JnaGc+TXF5cGR4XGVnY//bAEMBERISGBUYLxoaL2NCOEJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY//AABEIAEAAQAMBIgACEQEDEQH/xAAaAAACAwEBAAAAAAAAAAAAAAAEBQIDBgEA/8QAMRAAAgEDAgUCAwcFAAAAAAAAAQIDAAQREiEFIjFBUQZxExQyFSNCYYGR0VKhscHh/8QAFwEAAwEAAAAAAAAAAAAAAAAAAAECA//EAB0RAQEBAQACAwEAAAAAAAAAAAEAAhEhQQMSMXH/2gAMAwEAAhEDEQA/AE624t7cC3GVP1P3NXxxGZA5AQYwzHoa7GsagykkR+D+I1TNLJMc4wg8dBWH7aVjPbRbYaUjuTgV74zFMi3iUHpmhGITBb/NcEpZu1MJMQbkBsPCo/NTirIxG7Fo35iMFX/mls02nbrVsEglUEUciPbLNjSQ3QLS6/4br1SQrhxuV8+1MIZteI5Thh9LePyNRkkEJIVfvM8xPapFHxNO0Lpw0mhTypsKrUsvfKnqK6RXDtRFTzTTFVGcdBTSHgErgM8gXPUUPwUkXrAAbg71oYppRJzIVjOwJG5p9agJXP6ehEZKsxalk1sbRxGD9PfzWmk+NJKSgDL3BbH7Un4zbPrjZRqLNjA89qOwkIVBXU2c1OY/FhWX8S8rf6qLq68jrhh1FWWy60mTyuf2pNNAICOvSosoKGr2GhmBG6ncVCVVxsf1zROO4XbxJHHcxjmYaWptICVQggHrk+KzvDr145vlsAqzZ9qd3cXzUUaByuDk4PWl7tCuiwGKlg2dwRUXHPjGWzsaHgtVt7gSl2Y4xuSaC4/clIVVGKl2xkGn/IXkPdnXdSPtjOBv42rtsulpG7aDQsScgZmPjFHxJptmON3IUZOPeh82cBdcUgZtSBy5HNgYGfNAm+fVlVH606is4vtyV1gQRrHkR4yoJ2/ms5IMTOANgxrTJmnQlaLqT4msEKw6EVsljlSCKdRqjkQMrdtxWHxW94XfSWvpRJgok0R8oPQb43qnJLOnvKpneUY6nsFHWlnqWP5awiSYffyyagP6QB/2nHpa7nne4MkIKdVl04Ge4FZr1Xdm74zIM5WEaB79/wC9LOfdXyKP1hrW/jGBPkY21AZ29qc295bTygIUkRRpVCcH3xWV2r2KHJR2/9k=",
  //     "imageName": "test_00.jpg",
  //     "imageId": "test_00.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   },
  //   {
  //     "imageSrc": "data:image/jpeg;base64,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",
  //     "imageName": "test_01.jpg",
  //     "imageId": "test_01.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   },
  //   {
  //     "imageSrc": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMAEAsMDgwKEA4NDhIREBMYKBoYFhYYMSMlHSg6Mz08OTM4N0BIXE5ARFdFNzhQbVFXX2JnaGc+TXF5cGR4XGVnY//bAEMBERISGBUYLxoaL2NCOEJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY//AABEIAEAAQAMBIgACEQEDEQH/xAAaAAACAwEBAAAAAAAAAAAAAAAEBQIDBgEA/8QAMRAAAgEDAgUCAwcFAAAAAAAAAQIDAAQREiEFIjFBUQZxExQyFSNCYYGR0VKhscHh/8QAFwEAAwEAAAAAAAAAAAAAAAAAAAECA//EAB0RAQEBAQACAwEAAAAAAAAAAAEAAhEhQQMSMXH/2gAMAwEAAhEDEQA/AE624t7cC3GVP1P3NXxxGZA5AQYwzHoa7GsagykkR+D+I1TNLJMc4wg8dBWH7aVjPbRbYaUjuTgV74zFMi3iUHpmhGITBb/NcEpZu1MJMQbkBsPCo/NTirIxG7Fo35iMFX/mls02nbrVsEglUEUciPbLNjSQ3QLS6/4br1SQrhxuV8+1MIZteI5Thh9LePyNRkkEJIVfvM8xPapFHxNO0Lpw0mhTypsKrUsvfKnqK6RXDtRFTzTTFVGcdBTSHgErgM8gXPUUPwUkXrAAbg71oYppRJzIVjOwJG5p9agJXP6ehEZKsxalk1sbRxGD9PfzWmk+NJKSgDL3BbH7Un4zbPrjZRqLNjA89qOwkIVBXU2c1OY/FhWX8S8rf6qLq68jrhh1FWWy60mTyuf2pNNAICOvSosoKGr2GhmBG6ncVCVVxsf1zROO4XbxJHHcxjmYaWptICVQggHrk+KzvDr145vlsAqzZ9qd3cXzUUaByuDk4PWl7tCuiwGKlg2dwRUXHPjGWzsaHgtVt7gSl2Y4xuSaC4/clIVVGKl2xkGn/IXkPdnXdSPtjOBv42rtsulpG7aDQsScgZmPjFHxJptmON3IUZOPeh82cBdcUgZtSBy5HNgYGfNAm+fVlVH606is4vtyV1gQRrHkR4yoJ2/ms5IMTOANgxrTJmnQlaLqT4msEKw6EVsljlSCKdRqjkQMrdtxWHxW94XfSWvpRJgok0R8oPQb43qnJLOnvKpneUY6nsFHWlnqWP5awiSYffyyagP6QB/2nHpa7nne4MkIKdVl04Ge4FZr1Xdm74zIM5WEaB79/wC9LOfdXyKP1hrW/jGBPkY21AZ29qc295bTygIUkRRpVCcH3xWV2r2KHJR2/9k=",
  //     "imageName": "test_00.jpg",
  //     "imageId": "test_00.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   },
  //   {
  //     "imageSrc": "data:image/jpeg;base64,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",
  //     "imageName": "test_01.jpg",
  //     "imageId": "test_01.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   },
  //   {
  //     "imageSrc": "data:image/jpeg;base64,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",
  //     "imageName": "test_00.jpg",
  //     "imageId": "test_00.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   },
  //   {
  //     "imageSrc": "data:image/jpeg;base64,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",
  //     "imageName": "test_01.jpg",
  //     "imageId": "test_01.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   },
  //   {
  //     "imageSrc": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMAEAsMDgwKEA4NDhIREBMYKBoYFhYYMSMlHSg6Mz08OTM4N0BIXE5ARFdFNzhQbVFXX2JnaGc+TXF5cGR4XGVnY//bAEMBERISGBUYLxoaL2NCOEJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY//AABEIAEAAQAMBIgACEQEDEQH/xAAaAAACAwEBAAAAAAAAAAAAAAAEBQIDBgEA/8QAMRAAAgEDAgUCAwcFAAAAAAAAAQIDAAQREiEFIjFBUQZxExQyFSNCYYGR0VKhscHh/8QAFwEAAwEAAAAAAAAAAAAAAAAAAAECA//EAB0RAQEBAQACAwEAAAAAAAAAAAEAAhEhQQMSMXH/2gAMAwEAAhEDEQA/AE624t7cC3GVP1P3NXxxGZA5AQYwzHoa7GsagykkR+D+I1TNLJMc4wg8dBWH7aVjPbRbYaUjuTgV74zFMi3iUHpmhGITBb/NcEpZu1MJMQbkBsPCo/NTirIxG7Fo35iMFX/mls02nbrVsEglUEUciPbLNjSQ3QLS6/4br1SQrhxuV8+1MIZteI5Thh9LePyNRkkEJIVfvM8xPapFHxNO0Lpw0mhTypsKrUsvfKnqK6RXDtRFTzTTFVGcdBTSHgErgM8gXPUUPwUkXrAAbg71oYppRJzIVjOwJG5p9agJXP6ehEZKsxalk1sbRxGD9PfzWmk+NJKSgDL3BbH7Un4zbPrjZRqLNjA89qOwkIVBXU2c1OY/FhWX8S8rf6qLq68jrhh1FWWy60mTyuf2pNNAICOvSosoKGr2GhmBG6ncVCVVxsf1zROO4XbxJHHcxjmYaWptICVQggHrk+KzvDr145vlsAqzZ9qd3cXzUUaByuDk4PWl7tCuiwGKlg2dwRUXHPjGWzsaHgtVt7gSl2Y4xuSaC4/clIVVGKl2xkGn/IXkPdnXdSPtjOBv42rtsulpG7aDQsScgZmPjFHxJptmON3IUZOPeh82cBdcUgZtSBy5HNgYGfNAm+fVlVH606is4vtyV1gQRrHkR4yoJ2/ms5IMTOANgxrTJmnQlaLqT4msEKw6EVsljlSCKdRqjkQMrdtxWHxW94XfSWvpRJgok0R8oPQb43qnJLOnvKpneUY6nsFHWlnqWP5awiSYffyyagP6QB/2nHpa7nne4MkIKdVl04Ge4FZr1Xdm74zIM5WEaB79/wC9LOfdXyKP1hrW/jGBPkY21AZ29qc295bTygIUkRRpVCcH3xWV2r2KHJR2/9k=",
  //     "imageName": "test_00.jpg",
  //     "imageId": "test_00.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   },
  //   {
  //     "imageSrc": "data:image/jpeg;base64,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",
  //     "imageName": "test_01.jpg",
  //     "imageId": "test_01.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   },
  //   {
  //     "imageSrc": "data:image/jpeg;base64,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",
  //     "imageName": "test_00.jpg",
  //     "imageId": "test_00.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   },
  //   {
  //     "imageSrc": "data:image/jpeg;base64,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",
  //     "imageName": "test_01.jpg",
  //     "imageId": "test_01.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   },
  //   {
  //     "imageSrc": "data:image/jpeg;base64,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",
  //     "imageName": "test_00.jpg",
  //     "imageId": "test_00.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   },
  //   {
  //     "imageSrc": "data:image/jpeg;base64,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",
  //     "imageName": "test_01.jpg",
  //     "imageId": "test_01.jpg",
  //     "loader": true,
  //     "status": "successfully uploaded, awaiting results.."
  //   }
  // ];


  ngOnInit(): void {
    
  }

  openModal() {
    const dialogRef = this.dialog.open(DownloadPopUpComponent, {
      width: '600px',
    });

    dialogRef.afterClosed().subscribe(result => {
      this.receiveFiles(result)
    });
  }

  title = 'web-tier';

  async upload_file(file: any) {
    // Create an object and upload it to the Amazon S3 bucket.
    var contentType = file.type;

    var params_bucket_input_send = {
      Bucket: this.BUCKET_NAME,
      Key: file.name,
      Body: file,
      contentType: contentType
    };

    this.s3Client.upload(params_bucket_input_send, (err: any, data: any) => {
      if (err) {
        this.outputs += '\nThere was an error uploading your file: ' + JSON.stringify(err);
        console.log('There was an error uploading your file: ', err);
        this.grid.find((x: { imageId: any; }) => { x.imageId == file.name }).status = 'error uploading..'
        return false;
      }
      this.outputs += '\nSuccessfully uploaded file.' + JSON.stringify(data);
      console.log(this.grid, file.name, this.grid.find((x: any) => { x.imageId == file.name }))
      this.grid.find((x: any) => x.imageId == file.name).status = 'successfully uploaded, awaiting results..'
      return true;
    })

    // this.upload_file_queue(file)
  }

  async upload_file_queue(fileName: string, file: any) {
    //  Send to SQS
    try {

      var body = {
        fileName: fileName,
        file: file
      }

      var params_queue_send = {
        DelaySeconds: 0,
        MessageAttributes: {
          SessionID: {
            DataType: "String",
            StringValue: this.sessionID,
          },
        },
        MessageBody: JSON.stringify(body),
        // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
        // MessageGroupId: "Group1",  // Required for FIFO queues
        QueueUrl: this.queue_url //SQS_QUEUE_URL; e.g., 'https://sqs.REGION.amazonaws.com/ACCOUNT-ID/QUEUE-NAME'
      };

      const data = await this.sqsClient.send(new SendMessageCommand(params_queue_send));
      console.log(file);
      this.outputs += '\nSent Message' + JSON.stringify(data);
      console.log("Sent Message ", data);
      // return data; // For unit tests.
    } catch (err) {
      console.log("Error", err);

    }
  }


  async download_message(sqsClient: any, queue_url: string, sessionID: string, outputs: string, grid: any) {
    try {
      var params_queue_receive = {
        AttributeNames: ["SentTimestamp"],
        MaxNumberOfMessages: 10,
        MessageAttributeNames: ["All"],
        QueueUrl: queue_url,
        VisibilityTimeout: 5,
        WaitTimeSeconds: 0,
      };
      const data = await sqsClient.send(new ReceiveMessageCommand(params_queue_receive));
      if (data.Messages) {
        var filteredMessages = data.Messages.filter((x: any) =>
          x.MessageAttributes['SessionID']['StringValue'] === sessionID
        )
        console.log(filteredMessages)
        if (filteredMessages.length > 0) {
          for (var i = 0; i < filteredMessages.length; i++) {
            var obj = JSON.parse(filteredMessages[i].Body)
            if(grid.filter((x: any) => x.imageId === obj.fileName).length == 0)
            {grid.push({ 'imageSrc': obj.file, 'imageName': obj.fileName, 'imageId': obj.fileName, 'loader': true, status: 'waiting for results..' })}
            var deleteParams = {
              QueueUrl: queue_url,
              ReceiptHandle: filteredMessages[i].ReceiptHandle,
            };
            try {
              const data = await sqsClient.send(new DeleteMessageCommand(deleteParams));
              this.outputs += '\nMessage deleted' + JSON.stringify(data);
              console.log("Message deleted", data);
            } catch (err) {
              this.outputs += '\nError deleting result from queue' + JSON.stringify(err);
              console.log("Error", err);
            }
            
          }
        }
        

        
          // return data; // For unit tests.
        
      }
      else {
        this.outputs += "\nNo messages to delete";
        console.log("No messages to delete");
      }
    }
    catch (err) {
      this.outputs += "\nReceive Error" + JSON.stringify(err);
      console.log("Receive Error", err);
    }
  }

  // async get_requests(grid: any){
  //   this.requests.getResponses().subscribe(data => {
  //     var obj = JSON.parse(JSON.parse(data))
  //     if(grid.filter((x: any) => x.imageId === obj.fileName).length == 0)
  //     {grid.push({ 'imageSrc': obj.file, 'imageName': obj.fileName, 'imageId': obj.fileName, 'loader': true, status: 'waiting for results..' })}
  //   })
  // }

  add_to_grid(data: any) {
    console.log(data)

  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  receiveFiles(file: any) {
    this.reader.readAsDataURL(file);
    this.reader.onload = () => {
      this.grid.push({ 'imageSrc': this.reader.result as string, 'imageName': file.name, 'imageId': file.name, 'loader': true, status: 'uploading..' })
      this.upload_file_queue(file.name, this.reader.result as string)
    }
    this.upload_file(file)
  }

  concurrent_upload(requests: number){
    this.requests.getConcurrentRequests({number: requests}).subscribe(data => {
      this.outputs += data.data; console.log(this.outputs)})
  }
  scrolled(scroll: boolean)
  {
    if(scroll)
    this.scroll = true
    else
    {
      this.scroll = false
    }
  }
}
