#!/bin/bash

scp chathive/html/* root@chat-hive.mooo.com:/var/www/html/
ssh root@chat-hive.mooo.com systemctl restart jsapp