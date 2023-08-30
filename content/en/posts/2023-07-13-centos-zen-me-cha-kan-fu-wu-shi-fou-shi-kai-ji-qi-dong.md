+++
title = "centos怎么查看服务是否是开机启动"
date = "2023-07-13T11:21:15+08:00"
author = ""
authorTwitter = "" #do not include @
cover = ""
tags = ["教程"]
keywords = ["centos", "开机服务"]
description = ""
showFullContent = false
readingTime = true
hideComments = false
color = "" #color from the theme settings
+++

有的时候我们想一个服务开机自启动，但是设置好了以后不知道是不是成功以，我们可以用如下的命令来查看：
1、查看开机启动项
```shell
systemctl list-unit-files
```
2、查看某些服务开机启动状态
```shell
systemctl list-unit-files | grep 程序名称
```
3、斜体样式查看哪些为开机启动服务
```shell
systemctl list-unit-files | grep enable
```
4、开启自启动
```shell
systemctl enable 程序名称
```
5、关闭自启动
```shell
systemctl disable 程序名称
```

