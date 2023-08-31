+++
title = "ssh免密登陆（精简命令行登陆）"
date = "2023-07-19T20:51:45+08:00"
author = ""
authorTwitter = "" #do not include @
cover = ""
tags = ["教程"]
keywords = ["", ""]
description = "这篇文章简要记录一下免密登陆服务器的具体设置过程。"
showFullContent = false
readingTime = false
hideComments = false
color = "" #color from the theme settings
+++
这篇文章简要记录一下免密登陆服务器的具体设置过程。

每次ssh登陆服务器都需要输入一串字符，还要输入密码比较繁琐。如下：
```shell
ssh username@192.168.1.100
```
常用的登录命令形式，之后还需要输入密码验证。麻烦。如何才能简化呢。方法如下：

第一步：简化登陆命令行，效果如下：
```shell
ssh 100 <=等效于=> ssh username@192.168.1.100
```
方法如下：修改~/.ssh/config （如果没有.ssh或者config，就新建一个）
```shell
Host 100
HostName 192.168.1.100
Port 22
User username
```
保存后，输入：ssh 100 就可以等了服务器了，但是还是需要输入密码。

第二步：实现免密码登录

ssh常用公钥和私钥的方式实现免密码登录，在你安装ssh后，自带了一个ssh-genkey的工具生成公钥和私钥。设置方法如下：
```shell
test@ubuntu:~/.ssh$ ls
config
test@ubuntu:~/.ssh$
test@ubuntu:~/.ssh$ ssh-keygen
Generating public/private rsa key pair.
Enter file in which to save the key (/home/yaolan/.ssh/id_rsa): id_rsa (输入保存的文件名称)
Enter passphrase (empty for no passphrase): （输入Enter键）
Enter same passphrase again: （输入Enter键）
Your identification has been saved in id_rsa.
Your public key has been saved in id_rsa.pub.
The key fingerprint is:
14:b5:e4:73:1a:c7:95:d1:f4:86:3e:0c:6d:6e:cc:ef yaolan@VirtualBox
The key's randomart image is:
+--[ RSA 2048]----+
|    ..o  o=.|
|     + o o..o|
|    . = = + o|
|    .  * O . |
|    S .  O |
|       . o |
|        .|
|        . |
|        E|
+-----------------+
test@ubuntu:~/.ssh$ ls
config id_rsa id_rsa.pub
```
id_rsa私钥，id_rsa.pub公钥，采用RSA加密形式。我们只要把 id_rsa.pub里面的公钥添加到服务器上的~/.ssh/authorized_keys文件中即可。
```shell
cat ./id_rsa.pub >> ~/.ssh/authorized_keys
```
完成这步，我们就可以免密码等了
