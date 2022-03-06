var AWS = require("aws-sdk");

var credentials = {
    accessKeyId: 'AKIASLJLX3PW7QJ4F5OU',
    secretAccessKey: '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'
}

var REGION = 'us-east-1'

var ec2 = new AWS.EC2({ credentials: credentials, region: REGION });
var sqs = new AWS.SQS({ credentials: credentials, region: REGION });
var ec2_count = 0

function findInstanceName(ins) {
    for (var j in ins.Tags) {
        if (ins.Tags[j].Key === 'Name' && ins.Tags[j].Value.includes('app')) {
            return ins.Tags[j].Value;
        }
    }
    return null;
}
ec2_list = {}

function scalingLogic() {
    var totalMessages = 0
    var params = {
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/161689885677/RequestQueue',
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
    };
    sqs.getQueueAttributes(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            totalMessages = parseInt(data['Attributes']['ApproximateNumberOfMessages']) + parseInt(data['Attributes']['ApproximateNumberOfMessagesNotVisible']); // successful response
            console.log(totalMessages)
            var params_ec2 = {
                DryRun: false
            };
            ec2.describeInstances(params_ec2, function(err, data) {
                if (err) return console.log(err, err.stack);

                for (var i in data.Reservations) {
                    var ins = data.Reservations[i].Instances[0]
                    var name = findInstanceName(ins)
                    if (name === null) continue;

                    ec2_count += 1
                    ec2_list[name] = ins.InstanceId
                }
                console.log(ec2_count, ec2_list);
                //scale_in
                if (ec2_count > totalMessages) {
                    var params_terminate = {
                        InstanceIds: [process.argv[3]],
                        DryRun: true
                    };
                    ec2.terminateInstances(params_terminate, function(err, data) {
                        if (err && err.code === 'DryRunOperation') {
                            params.DryRun = false;
                            ec2.stopInstances(params, function(err, data) {
                                if (err) {
                                    console.log("Error", err);
                                } else if (data) {
                                    console.log("Success", data.StoppingInstances);
                                }
                            });
                        } else {
                            console.log("You don't have permission to stop instances");
                        }
                    });
                }
            });

        }
    });
}

scalingLogic()