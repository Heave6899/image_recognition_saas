// we use express and multer libraries to send images
const express = require('express');
const multer = require('multer');
const cors = require('cors')
const app = express(cors());
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
const AWS = require('aws-sdk');
const path = require("path");
const PORT = 3000;
const credentials = {
    accessKeyId: 'AKIASLJLX3PW7QJ4F5OU',
    secretAccessKey: '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'
}
const { spawn } = require('child_process');
const REGION = "us-east-1";
const BUCKET_NAME = "cloudcomputinginputs"
const queue_url = 'https://sqs.us-east-1.amazonaws.com/161689885677/RequestQueue'
const sessionID = 'e7a09730-88b5-2888-d3a0-e970f6160982'
    // uploaded images are saved in the folder "/upload_images"
const upload = multer({ dest: __dirname + '/upload_images' });
const s3 = new AWS.S3({ credentials: credentials, region: REGION });
const sqs = new AWS.SQS({ credentials: credentials, region: REGION })
app.use(express.static('public'));
app.use(express.json())
app.timeout = 0;
// "myfile" is the key of the http payload
app.post('/', upload.single('myfile'), function(request, respond) {
    if (request.file) console.log(request.file);

    // save the image
    var fs = require('fs');
    fs.renameSync(__dirname + '/upload_images/' + request.file.filename, __dirname + '/upload_images/' + request.file.originalname, function(err) {
        if (err) console.log('ERROR: ' + err);
    });
    filePath = __dirname + '/upload_images/' + request.file.originalname
    let bucketPath = request.file.originalname;
    let params = { Bucket: BUCKET_NAME, Key: bucketPath, Body: fs.readFileSync(filePath) };
    var body = {
        fileName: bucketPath,
        file: 'data:image/jpeg;base64,' + fs.readFileSync(filePath, { encoding: 'base64' }).toString()
    }

    var params_queue_send = {
        DelaySeconds: 0,
        MessageAttributes: {
            SessionID: {
                DataType: "String",
                StringValue: sessionID,
            },
        },
        MessageBody: JSON.stringify(body),
        // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
        // MessageGroupId: "Group1",  // Required for FIFO queues
        QueueUrl: queue_url //SQS_QUEUE_URL; e.g., 'https://sqs.REGION.amazonaws.com/ACCOUNT-ID/QUEUE-NAME'
    };
    // uncomment when limit refreshes
    // s3.putObject(params, function(err, data) {
    //     if (err) {
    //         // console.log(err)
    //     } else {
    //         // console.log('Successfully uploaded ' + bucketPath + ' to ' + BUCKET_NAME);
    //     }
    // });
    // console.log(params_queue_send)

    sqs.sendMessage(params_queue_send, function(err, data) {
        // console.log("Done sendMessage")
        if (err) {
            // console.log("Error", err);
        } else {
            console.log("Success", data.MessageId);
        }
    });

    //Send classification inside.
    // var params_queue_receive = {
    //     QueueUrl: queue_url,
    //     MaxNumberOfMessages: 10,
    //     VisibilityTimeout: 2,
    //     WaitTimeSeconds: 4,
    // };

    // function receiveMessages(respond) {
    //     sqs.receiveMessage(params_queue_receive, (err, data) => {
    //         if (err) console.log(err, err.stack); // an error occurred
    //         else {
    //             console.log(data);
    //             if (data.Messages) {
    //                 for (var i = 0; i < data.Messages.length; i++) {
    //                     var obj = JSON.parse(data.Messages[i].Body)
    //                     if (obj.fileName == request.file.originalname) {
    //                         //Pending, delete the message from SQS Queue.
    //                         respond.end(obj);
    //                     }
    //                 }
    //             }

    //         }
    //     })
    // }
    // setInterval(receiveMessages, 5000, respond)

    respond.end("uploaded.");
});


app.post('/script', (req, res) => {
    var dataToSend;
    var request = req.body
    console.log(req.body)
    const python = spawn('python3', ['multithread_workload_generator.py', '--num_request', request.number, '--url', 'http://0.0.0.0:3000', '--image_folder', './face_images_100/']);
    python.stdout.on('data', function(data) {
        console.log('Pipe data from python script ...');
        dataToSend = data.toString();
    });
    python.on('close', (code) => {
        console.log(`child process close all stdio with code ${code}`);
        // send data to browser
        res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
        res.send(dataToSend)
    });
})

// You need to configure node.js to listen on 0.0.0.0 so it will be able to accept connections on all the IPs of your machine
const hostname = '0.0.0.0';
app.listen(PORT, hostname, () => {
    console.log(`app running at http://${hostname}:${PORT}/`);
});