var AWS = require('aws-sdk');
var path = require("path");
var fs = require('fs');
var credentials = {
    accessKeyId: 'AKIASLJLX3PW7QJ4F5OU',
    secretAccessKey: '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'
}
var REGION = "us-east-1";
var BUCKET_NAME = "cloudcomputinginputs"
var queue_url = 'https://sqs.us-east-1.amazonaws.com/161689885677/RequestQueue'
var sessionID = 'e7a09730-88b5-2888-d3a0-e970f6160982'
var express = require('express')
var cors = require('cors')
const { spawn } = require('child_process');
var app = express(cors())
    // const fileupload = require("express-fileupload");
app.use(express.json())
    // app.use(fileupload());
const multer = require('multer');
const upload = multer({ dest: __dirname + '/upload_images' });
app.use(express.static('public'));

const port = 3000
const uploadDir = function(s3Path) {

    let s3 = new AWS.S3({ credentials: credentials, region: REGION });
    let sqs = new AWS.SQS({ credentials: credentials, region: REGION })

    function walkSync(currentDirPath, callback) {
        fs.readdirSync(currentDirPath).forEach(function(name) {
            var filePath = path.join(currentDirPath, name);
            var stat = fs.statSync(filePath);
            if (stat.isFile()) {
                callback(filePath, stat);
            } else if (stat.isDirectory()) {
                walkSync(filePath, callback);
            }
        });
    }

    walkSync(s3Path, function(filePath, stat) {
        let bucketPath = filePath.substring(s3Path.length + 1);
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
                // console.log("Success", data);
            }
        });
    });
};

app.get('/concurrent', (req, res) => {
    uploadDir(__dirname + "/face_images_100");
    list = []
    fs.readdirSync(__dirname + "/face_images_100").forEach(file => {
        // console.log(file);
        list.push('Found file: ' + file + ' uploading..')
    });
    console.log(list)
        // list.forEach()
    res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.send({ data: list.toString() })
})

app.get('/app', (req, res) => {
    res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.send({ data: 'Hello' })
})

app.post('/single', upload.single('myfile'), (req, res) => {
    console.log(req.files.myfile.name)
    if (req.file) console.log(req.file);

    // save the image
    // var fs = require('fs');
    // fs.rename(__dirname + '/upload_images/' + req.files.myfile.name, __dirname + '/upload_images/' + req.file.originalname, function(err) {
    //     if (err) console.log('ERROR: ' + err);
    // });

    var body = {
        fileName: req.files.myfile.name,
        file: 'data:image/jpeg;base64,' + fs.readFileSync(__dirname + '/upload_images/' + req.files.myfile.name, { encoding: 'base64' }).toString()
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
    res.send(req.file.originalname + ' uploaded!');
})

app.post('/script', (req, res) => {
    var dataToSend;
    var request = req.body
    const python = spawn('python3', ['multithread_workload_generator.py', '--num_request', request.number, '--url', 'http://0.0.0.0:3000/single', '--image_folder', './face_images_100/']);
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

const hostname = '0.0.0.0';
app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
})