console.log('Loading event');
var AWS = require('aws-sdk');
var async = require('async');
var util = require('util');
var cv = require('cv');
var twilio = require('twilio')('API_KEY')('AUTH_TOKEN')
var s3 = new AWS.S3();
var rcptNumber = '+16506900657'
var fromNumber = '+12345968901'

exports.handler = function(event, context) {
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var imgBucket = event.Records[0].s3.bucket.name;
    var imgKey    = event.Records[0].s3.object.key;
    var typeMatch = imgKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        console.error('unable to infer image type for key ' + imgKey);
        return;
    }
    var imageType = typeMatch[1];
    if (imageType != "jpg" && imageType != "png") {
        console.log('skipping non-image ' + imgKey);
        return;
    }
    async.waterfall([
        function download(next) {
            s3.getObject({Bucket: imgBucket, Key: imgKey}, next);
        },
        function detect(image, next) {
            cv.readImage(image.Body, function(err, im) {
                im.detectObject(cv.FACE_CASCADE, {}, function(err, faces) {
                    if(!faces.length) {
                        next(false, null);
                    } else {
                        for (var i=0;i<faces.length; i++) {
                            var x = faces[i];
                            im.ellipse(x.x + x.width/2, x.y + x.height/2, x.width/2, x.height/2);
                        }
                    }
                    im.toBuffer(imageType, function(err, buffer) {
                        if (err) {
                            next(err);
                        } else {
                            next(true, image.ContenType, buffer);
                        }
                    });
                });
            });
        },
        function upload(faces, contentType, data, next) {
            if (faces) {
                s3.putObject({
                    Bucket: -,
                    Key: -,
                    Body: data,
                    ContentType: contentType
                }, next);
            } else {
                next();
            }
        },
        function (err) {
            if (err) {
            } else {
            }
            context.done()
        }
    ]);
};
