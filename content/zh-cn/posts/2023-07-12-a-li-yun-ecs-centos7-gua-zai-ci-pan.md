+++
title = "阿里云ECS CENTOS7挂载磁盘"
date = "2023-07-12T17:17:33+08:00"
author = ""
authorTwitter = "" #do not include @
cover = ""
tags = ["教程"]
keywords = ["阿里云", "ECS", "磁盘"]
description = ""
showFullContent = false
readingTime = true
hideComments = false
color = "" #color from the theme settings
+++


挂载第1个磁盘：
* 运行 fdisk -l 命令查看数据盘
* 运行 fdisk /dev/vdb，对数据盘进行分区。根据提示，依次输入 n，p，1，两次回车，wq，分区就开始了
* 运行 fdisk -l 命令，查看新的分区
* 运行 mkfs.ext3 /dev/vdb1，对新分区进行格式化。格式化所需时间取决于数据盘大小
* 运行 echo /dev/vdb1 /data ext3 defaults 0 0 >> /etc/fstab 写入新分区信息。完成后，可以使用 cat /etc/fstab 命令查看
* 运行 mkdir /data
* 运行 mount -a 挂载新分区，然后执行 df -h 查看分区

挂载第2个磁盘：
* 运行 fdisk -l 命令查看数据盘
* 运行 fdisk /dev/vdc，对数据盘进行分区。根据提示，依次输入 n，p，1，两次回车，wq，分区就开始了
* 运行 fdisk -l 命令，查看新的分区
* 运行 mkfs.ext3 /dev/vdc1，对新分区进行格式化。格式化所需时间取决于数据盘大小
* 运行 echo /dev/vdc1 /backup ext3 defaults 0 0 >> /etc/fstab 写入新分区信息。完成后，可以使用 cat /etc/fstab 命令查看
* 运行 mkdir /backup
* 运行 mount -a 挂载新分区，然后执行 df -h 查看分区

挂载第N个磁盘：......