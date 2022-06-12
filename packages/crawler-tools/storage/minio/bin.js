#!/usr/bin/env node

let minio = require("./minio");
minio.startMinioServerFromConfigFileSync();
