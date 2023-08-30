+++
title = "搜索服务器选购及部署"
date = "2023-07-18T17:18:13+08:00"
author = ""
authorTwitter = "" #do not include @
cover = ""
tags = ["教程"]
keywords = ["搜索服务器", "es"]
description = "..."
showFullContent = false
readingTime = true
hideComments = false
color = "" #color from the theme settings
+++

## 选购

> 内存 64GB
> 硬盘ESSD 100GB
> cpu 8核

### 内存
64 GB 内存的机器是非常理想的， 但是32 GB 和16 GB 机器也是很常见的。少于8 GB 会适得其反（你最终需要很多很多的小机器），大于64 GB 的机器也会有问题

### CPU
大多数 Elasticsearch 部署往往对 CPU 要求不高。因此，相对其它资源，具体配置多少个（CPU）不是那么关键。你应该选择具有多个内核的现代处理器，常见的集群使用两到八个核的机器。

### 硬盘
硬盘对所有的集群都很重要，对大量写入的集群更是加倍重要（例如那些存储日志数据的）。硬盘是服务器上最慢的子系统，这意味着那些写入量很大的集群很容易让硬盘饱和，使得它成为集群的瓶颈。

如果你负担得起 SSD，它将远远超出任何旋转介质（注：机械硬盘，磁带等）。 基于 SSD 的节点，查询和索引性能都有提升。如果你负担得起，SSD 是一个好的选择。

## 部署

```shell

# 创建elk用户
groupadd elk
useradd elk -g elk -p elk
mkdir -p /data/users/elk
chown elk:elk /data/users/elk

# 进入elk用户模式
cd /data/users/elk
su elk

# 下载es
mkdir downloads
cd downloads

# 到官网下载elasticsearch-8.7.0，解压到/data/users/elk/elasticsearch-8.7.0

# 配置，进入es软件目录
# 设置config/elasticsearch.yml 把端口改为29200
# 禁止 swap，一旦允许内存与磁盘的交换，会引起致命的性能问题。可以通过在 elasticsearch.yml中 bootstrap.memory_lock: true，以保持 JVM 锁定内存，保证 ES 的性能

# 启动es
cd /data/users/elk/elasticsearch-8.7.0;./bin/elasticsearch -d -p es29200.pid
```

### 把你的内存的（少于）一半给 Lucene
一个常见的问题是给 Elasticsearch 分配的内存 太 大了。假设你有一个 64 GB 内存的机器， 天啊，我要把 64 GB 内存全都给 Elasticsearch。因为越多越好啊！

当然，内存对于 Elasticsearch 来说绝对是重要的，它可以被许多内存数据结构使用来提供更快的操作。但是说到这里， 还有另外一个内存消耗大户 非堆内存 （off-heap）：Lucene。

Lucene 被设计为可以利用操作系统底层机制来缓存内存数据结构。 Lucene 的段是分别存储到单个文件中的。因为段是不可变的，这些文件也都不会变化，这是对缓存友好的，同时操作系统也会把这些段文件缓存起来，以便更快的访问。

Lucene 的性能取决于和操作系统的相互作用。如果你把所有的内存都分配给 Elasticsearch 的堆内存，那将不会有剩余的内存交给 Lucene。 这将严重地影响全文检索的性能。

标准的建议是把 50％ 的可用内存作为 Elasticsearch 的堆内存，保留剩下的 50％。当然它也不会被浪费，Lucene 会很乐意利用起余下的内存。

如果你不需要对分词字符串做聚合计算（例如，不需要 fielddata ）可以考虑降低堆内存。堆内存越小，Elasticsearch（更快的 GC）和 Lucene（更多的内存用于缓存）的性能越好。

### 不要超过 32 GB！
这里有另外一个原因不分配大内存给 Elasticsearch。事实上， JVM 在内存小于 32 GB 的时候会采用一个内存对象指针压缩技术。

在 Java 中，所有的对象都分配在堆上，并通过一个指针进行引用。 普通对象指针（OOP）指向这些对象，通常为 CPU 字长 的大小：32 位或 64 位，取决于你的处理器。指针引用的就是这个 OOP 值的字节位置。

对于 32 位的系统，意味着堆内存大小最大为 4 GB。对于 64 位的系统， 可以使用更大的内存，但是 64 位的指针意味着更大的浪费，因为你的指针本身大了。更糟糕的是， 更大的指针在主内存和各级缓存（例如 LLC，L1 等）之间移动数据的时候，会占用更多的带宽。

Java 使用一个叫作 内存指针压缩（compressed oops）的技术来解决这个问题。 它的指针不再表示对象在内存中的精确位置，而是表示 偏移量 。这意味着 32 位的指针可以引用 40 亿个 对象 ， 而不是 40 亿个字节。最终， 也就是说堆内存增长到 32 GB 的物理内存，也可以用 32 位的指针表示。

一旦你越过那个神奇的 ~32 GB 的边界，指针就会切回普通对象的指针。 每个对象的指针都变长了，就会使用更多的 CPU 内存带宽，也就是说你实际上失去了更多的内存。事实上，当内存到达 40–50 GB 的时候，有效内存才相当于使用内存对象指针压缩技术时候的 32 GB 内存。

这段描述的意思就是说：即便你有足够的内存，也尽量不要 超过 32 GB。因为它浪费了内存，降低了 CPU 的性能，还要让 GC 应对大内存。
