const query = require("./pool"),
  util = require("./util"),
  Koa = require("koa"),
  router = require("koa-router")(),
  bodyParser = require("koa-bodyparser"),
  koaBody = require("koa-body"),
  Multiparty = require("multiparty"),
  Uuid = require("node-uuid"),
  moment = require("moment"),
  fs = require("fs"),
  path = require("path");

const KoaRouterInterceptor = require("koa-router-interceptor");

let http = require("http");

const app = new Koa();

// 用户登录
router.post("/task/login", async ctx => {
  let { account, pass } = ctx.request.body;
  let queryStr = "select * from user where `key` = ?";
  res = await query(queryStr, [account]);
  if (res && res.length) {
    let userInfo = res[0];
    if (userInfo.pass != pass) {
      ctx.response.body = { status: 400, msg: "密码错误", data: null };
    } else {
      let token = Uuid.v1();
      // 记录登录次数
      let logintimes = userInfo.logintimes + 1;
      // 记录上次登录时间
      let lastLoginTime = userInfo.loginTime;
      // 本次登录时间
      let loginTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
      // 设置token
      let updateStr = `update user SET token = ?,logintimes = ?,lastLoginTime = ?,loginTime =? where id = ?`;
      await query(updateStr, [
        token,
        logintimes,
        lastLoginTime,
        loginTime,
        userInfo.id
      ]);
      ctx.response.body = {
        status: 200,
        msg: "登录成功",
        data: Object.assign(userInfo, { token: token })
      };
    }
  } else {
    ctx.response.body = { status: 400, msg: "用户不存在", data: null };
  }
});

// 查询用户列表
router.get("/task/user/list", async ctx => {
  let res = [];
  let selectStr = `select * from user`;
  res = await query(selectStr);
  ctx.response.body = { status: 200, msg: "", data: res };
});

// 查询用户详情
router.post("/task/user/info", async ctx => {
  let { id } = ctx.request.body;
  let res = [];
  let selectStr = `select * from user where id = ?`;
  res = await query(selectStr, [id]);
  ctx.response.body = { status: 200, msg: "", data: res[0] };
});

// 删除用户
router.post("/task/user/delete", async ctx => {
  let params = ctx.request.body;
  let deleteStr = "delete from user where `id` = ?";
  res = await query(deleteStr, [params.id]);
  ctx.response.body = { status: 200, msg: "删除用户成功", data: null };
});

// 更新用户信息
router.post("/task/user/update", async ctx => {
  let params = ctx.request.body;
  if (params.oldPass) {
    let selectStr = `select * from user where id = ?`;
    let userInfo = await query(selectStr, [params.id]);
    if (userInfo && userInfo[0]) {
      if (userInfo[0].pass != params.oldPass) {
        ctx.response.body = { status: 400, msg: "旧密码不正确", data: null };
      } else {
        let updateParams = [];
        let values = [];
        let whitefields = [
          "name",
          "key",
          "department",
          "group",
          "team",
          "remark",
          "pass"
        ];
        for (let key in params) {
          if (whitefields.includes(key)) {
            updateParams.push(`\`${key}\` = ?`);
            values.push(params[key]);
          }
        }
        values.concat(params.id);
        let updateStr = `update user SET ${updateParams.join(
          ","
        )} where id = ?`;
        res = await query(updateStr, values.concat(params.id));
        ctx.response.body = { status: 200, msg: "更新用户成功", data: null };
      }
    }
  } else {
    let updateParams = [];
    let values = [];
    let whitefields = [
      "name",
      "key",
      "department",
      "group",
      "team",
      "remark",
      "pass"
    ];
    for (let key in params) {
      if (whitefields.includes(key)) {
        updateParams.push(`\`${key}\` = ?`);
        values.push(params[key]);
      }
    }
    values.concat(params.id);
    let updateStr = `update user SET ${updateParams.join(",")} where id = ?`;
    res = await query(updateStr, values.concat(params.id));
    ctx.response.body = { status: 200, msg: "更新用户成功", data: null };
  }
});

// 添加用户
router.post("/task/user/add", async ctx => {
  let params = ctx.request.body;
  let uuid = Uuid.v1();
  let createtime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
  let inputParams = [
    [
      uuid,
      params.name,
      params.key,
      params.department,
      params.group,
      params.team,
      params.remark,
      createtime,
      params.pass,
      params.role
    ]
  ];
  let insertStr =
    "insert into user(id,name,`key`,department,`group`,`team`,remark,createtime,pass,role) values ?";
  res = await query(insertStr, [inputParams], function(err, result) {
    if (err) {
      console.log("[INSERT ERROR] - ", err.message);
      return;
    }
    console.log("--------------------------INSERT----------------------------");
    console.log("INSERT ID:", result);
    console.log(
      "-----------------------------------------------------------------\n\n"
    );
  });
  ctx.response.body = { status: 200, msg: "添加用户成功", data: null };
});

// 参数处理
let dealInParams = arr => {
  let res = [];
  arr.forEach(p => {
    res.push("?");
  });
  return res.join(",");
};

// 查询任务列表
router.post("/task/list", async ctx => {
  let res = [];
  let params = ctx.request.body;
  let selectParams = [];
  let values = [];
  for (let key in params) {
    if (fields.includes(key)) {
      // 数组 in,非数组 =
      if (params[key]) {
        if (Array.isArray(params[key])) {
          if (dealInParams(params[key])) {
            selectParams.push(`${key} in (${dealInParams(params[key])})`);
            values = values.concat(params[key]);
          }
        } else {
          selectParams.push(`${key} = ?`);
          values.push(params[key]);
        }
      }
    }
  }

  let selectPrefix = `select * from worktask`;
  let selectSuffix = "";
  let timeRange = ` and startTime > '${params.startTime}' and startTime < '${params.endTime}'`;
  let selectParamsStr = "";
  // 分页
  if (params.page && params.limit) {
    selectSuffix = ` limit ${(params.page - 1) * params.limit}, ${params.page *
      params.limit}`;
  }
  if (selectParams && selectParams.length) {
    selectParamsStr = `and  ${selectParams.join(" and ")}`;
  }
  let selectStr = ``;
  // 查询时间范围内
  if (params.startTime) {
    selectStr = `${selectPrefix} where isDel = 0 ${selectParamsStr}${timeRange} order by endTime desc`;
  } else {
    selectStr = `${selectPrefix} where isDel = 0 ${selectParamsStr} order by endTime desc`;
  }
  res = await query(`${selectStr}${selectSuffix}`, values);
  let totalRes = await query(selectStr, values);

  // 添加超时时间
  res.forEach(item => {
    let curTime = new Date();
    let overtime = curTime - new Date(item.endTime);
    // 运行态任务
    if (
      item.status != "shelve" &&
      item.status != "waitAssign" &&
      item.status != "end"
    ) {
      item.overtime = overtime;
    }
  });
  ctx.response.body = {
    status: 200,
    msg: "",
    data: { total: totalRes.length, records: res }
  };
});

// 单个任务更新记录
router.post("/task/record", async ctx => {
  let { taskId } = ctx.request.body;
  let selectStr = `select * from taskrecord where taskId = ? and isDel = 0 order by updatetime asc`;
  res = await query(selectStr, [taskId]);
  ctx.response.body = { status: 200, msg: "", data: res };
});
// 任务统计
router.post("/task/statistics", async ctx => {
  let response = {
    legend: [],
    series: []
  };
  let selectStr = `select * from worktask where isDel = 0`;
  res = await query(selectStr);
  // 统计
  let waitAssignList = res.filter(item => item.status == "waitAssign");
  let shelveList = res.filter(item => item.status == "shelve");
  let backlogList = res.filter(item => item.status == "backlog");
  let demandingList = res.filter(item => item.status == "demanding");
  let designingList = res.filter(item => item.status == "designing");
  let codingList = res.filter(item => item.status == "coding");
  let testingList = res.filter(item => item.status == "testing");
  let endList = res.filter(item => item.status == "end");

  response.series.push({ name: "待分配", value: waitAssignList.length });
  response.series.push({ name: "待办", value: backlogList.length });
  response.series.push({ name: "搁置", value: shelveList.length });
  response.series.push({ name: "需求分析中", value: demandingList.length });
  response.series.push({ name: "设计中", value: designingList.length });
  response.series.push({ name: "编码中", value: codingList.length });
  response.series.push({ name: "测试中", value: testingList.length });
  response.series.push({ name: "完结", value: endList.length });
  response.legend = response.series.map(m => m.name);

  ctx.response.body = { status: 200, msg: "", data: response };
});

// 查询任务详情
router.post("/task/info", async ctx => {
  let res = {};
  let params = ctx.request.body;
  res = await util.getTaskInfo(params.id);
  ctx.response.body = { status: 200, msg: "", data: res };
});

let fields = [
  "name",
  "owner",
  "status",
  "priority",
  "startTime",
  "endTime",
  "estimatedTime",
  "estimatedInfo",
  "creator",
  "finished",
  "tag",
  "createtime"
];

// 任务更新
router.post("/task/update", async ctx => {
  let params = ctx.request.body;

  let updateParams = [];
  let values = [];
  for (let key in params) {
    if (fields.includes(key)) {
      updateParams.push(`${key} = ?`);
      if (Array.isArray(params[key])) {
        params[key] = params[key].join(",");
      }
      values.push(params[key]);
    }
  }
  values.concat(params.id);
  let updateStr = `update worktask SET ${updateParams.join(",")} where id = ?`;
  res = await query(updateStr, values.concat(params.id));

  let taskInfo = await util.getTaskInfo(params.id);
  // 组装任务记录信息
  let record = [
    Uuid.v1(),
    taskInfo.finished,
    taskInfo.status,
    moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
    params.updateInfo || `任务[${taskInfo.name}]分配成功`,
    taskInfo.id, //任务id
    ctx.request.header.userName
  ];
  await util.setTaskRecord(record);

  ctx.response.body = { status: 200, msg: "更新任务成功", data: null };
});

router.post("/task/delete", async ctx => {
  let params = ctx.request.body;
  let deleteStr = `update worktask SET isDel = 1 where id = ?`;
  res = await query(deleteStr, [params.id]);
  // 删除记录
  let deleteRecordStr = `update taskrecord SET isDel = 1 where taskId = ?`;
  res = await query(deleteRecordStr, [params.id]);

  ctx.response.body = { status: 200, msg: "删除任务成功", data: null };
});

//分配任务
router.post("/task/allocate", async ctx => {
  let res = [];
  let params = ctx.request.body;
  let owners = params.owner.join(",");
  let str = `update worktask SET owner = ? where id = ?`;
  res = await query(str, [owners, params.id]);

  let taskInfo = await util.getTaskInfo(params.id);
  // 组装任务记录信息
  let record = [
    Uuid.v1(),
    0,
    taskInfo.status,
    moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
    `任务[${taskInfo.name}]分配成功`,
    taskInfo.id, //任务id
    ctx.request.header.userName
  ];
  await util.setTaskRecord(record);
  ctx.response.body = { status: 200, msg: "分配任务成功", data: null };
});

// 创建任务
router.post("/task/create", async ctx => {
  let params = ctx.request.body;
  let uuid = Uuid.v1();
  let createtime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
  let owners = params.owner && params.owner.join(",");
  let inputParams = [
    [
      uuid,
      params.name,
      owners,
      params.status,
      params.startTime,
      params.endTime,
      params.priority,
      params.estimatedTime,
      params.estimatedInfo,
      params.creator,
      params.finished,
      createtime,
      0,
      params.tag
    ]
  ];
  let insertStr = `insert into worktask(id,name,owner,status,startTime,endTime,priority,estimatedTime,estimatedInfo,creator,finished,createtime,isDel,tag) values ?`;
  res = await query(insertStr, [inputParams]);
  // 组装任务记录信息
  let record = [
    Uuid.v1(),
    0,
    params.status,
    createtime,
    `任务[${params.name}]创建成功`,
    uuid,
    ctx.request.header.userName
  ];
  await util.setTaskRecord(record);
  ctx.response.body = { status: 200, msg: "创建任务成功", data: null };
});

// 添加机器
router.post("/task/host/create", async ctx => {
  let params = ctx.request.body;
  let uuid = Uuid.v1();
  let createtime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
  let inputParams = [
    [
      uuid,
      params.ip,
      params.protocol,
      params.port,
      params.alias,
      params.username,
      params.password,
      params.desc,
      ctx.request.header.userName,
      createtime, //使用次数
      0,
      0
    ]
  ];
  let insertStr =
    "insert into host(uuid,`ip`,`protocol`,`port`,`alias`,username,`password`,`desc`,creator,createtime,usetime,isDel) values ?";
  res = await query(insertStr, [inputParams]);
  ctx.response.body = { status: 200, msg: "添加机器成功", data: null };
});

// 机器列表
router.post("/task/host/list", async ctx => {
  let queryStr = `select * from host where isDel = 0`;
  let res = await query(queryStr);
  ctx.response.body = { status: 200, msg: null, data: res };
});

// 机器删除
router.post("/task/host/delete", async ctx => {
  let params = ctx.request.body;
  let deleteStr = `update host SET isDel = 1 where uuid = ?`;
  res = await query(deleteStr, [params.uuid]);
  ctx.response.body = { status: 200, msg: "删除机器成功", data: null };
});

// 创建任务
router.post("/task/project/create", async ctx => {
  let params = ctx.request.body;
  let uuid = Uuid.v1();
  let createtime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
  let inputParams = [
    [
      uuid,
      params.name,
      params.desc,
      params.type,
      params.color || "#909399",
      params.url,
      params.hero,
      params.star,
      ctx.request.header.userName,
      createtime,
      0
    ]
  ];
  let insertStr =
    "insert into project(id,`name`,`desc`,type,color,url,hero,star,creator,createtime,isDel) values ?";
  res = await query(insertStr, [inputParams]);
  ctx.response.body = { status: 200, msg: "创建项目成功", data: null };
});

// 项目列表
router.post("/task/project/list", async ctx => {
  let queryStr = `select * from project where isDel = 0`;
  let res = await query(queryStr);
  ctx.response.body = { status: 200, msg: null, data: res };
});

// md图片上传
router.post("/task/upload/files", async ctx => {
  // 上传单个文件
  const file = ctx.request.files.file; // 获取上传文件
  // 创建可读流
  const reader = fs.createReadStream(file.path);
  let randomCode = Uuid.v1();
  let fileNames = file.name.split(".");
  let filePath =
    path.join(__dirname, "md/") +
    `${fileNames[0]}${randomCode}.${fileNames[1]}`;
  // 创建可写流
  const upStream = fs.createWriteStream(filePath);
  // 可读流通过管道写入可写流
  reader.pipe(upStream);
  ctx.response.body = {
    status: 200,
    msg: null,
    data: `/md/${fileNames[0]}${randomCode}.${fileNames[1]}`
  };
});

router.post("/task/delete/files", async ctx => {
  let { fileName } = ctx.request.body;
  fs.unlink(`/md/${fileName}`, function(err) {
    if (err) {
      throw err;
    }
    ctx.response.body = { status: 200, msg: "文件删除成功", data: null };
  });
});

// md上传
router.post("/task/md/save", async ctx => {
  let params = ctx.request.body;
  let uuid = Uuid.v1();
  let createtime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
  let inputParams = [
    [
      uuid,
      params.title,
      params.context,
      params.label,
      ctx.request.header.userName,
      createtime,
      0
    ]
  ];
  let insertStr =
    "insert into doc(id,`title`,`context`,`label`,creator,createtime,isDel) values ?";
  res = await query(insertStr, [inputParams]);
  ctx.response.body = { status: 200, msg: "发布文档成功", data: null };
});

// 文档列表(标题，标签过滤)
router.post("/task/md/list", async ctx => {
  let { title, label } = ctx.request.body;
  let params = [];
  let queryStr = `select * from doc where isDel = 0`;
  if (title) {
    queryStr += ` and title LIKE ?`;
    params.push("%" + title + "%");
  }
  if (label) {
    queryStr += " and `label` = ?";
    params.push(label);
  }
  let res = await query(queryStr, params);
  ctx.response.body = { status: 200, msg: null, data: res };
});

// 文档详情
router.post("/task/md/info", async ctx => {
  let { id } = ctx.request.body;
  let selectStr = `select * from doc where isDel = 0 and id = ?`;
  let res = await query(selectStr, [id]);
  ctx.response.body = { status: 200, msg: null, data: res ? res[0] : {} };
});

// 文档删除
router.post("/task/md/delete", async ctx => {
  let params = ctx.request.body;
  let deleteStr = `update doc SET isDel = 1 where id = ?`;
  res = await query(deleteStr, [params.id]);
  ctx.response.body = { status: 200, msg: "删除文档成功", data: null };
});

// 文档阅读
router.post("/task/md/read", async ctx => {
  let params = ctx.request.body;
  let selectStr = `select * from doc where isDel = 0 and id = ?`;
  let selectList = await query(selectStr, [params.id]);
  if (selectList && selectList.length) {
    let readtime = selectList[0].readtime;
    let deleteStr = `update doc SET readtime = ? where id = ?`;
    let res = await query(deleteStr, [readtime + 1, params.id]);
    ctx.response.body = { status: 200, msg: "正在阅读", data: null };
  } else {
    ctx.response.body = { status: 404, msg: "文档不存在", data: null };
  }
});

// 文档更新
router.post("/task/md/update", async ctx => {
  let params = ctx.request.body;
  // 更新时间、更新者
  params.creator = ctx.request.header.userName;
  params.createtime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
  let updateParams = [];
  let values = [];
  for (let key in params) {
    updateParams.push(`${key} = ?`);
    if (Array.isArray(params[key])) {
      params[key] = params[key].join(",");
    }
    values.push(params[key]);
  }
  values.concat(params.id);
  let updateStr = `update doc SET ${updateParams.join(",")} where id = ?`;
  res = await query(updateStr, values.concat(params.id));
  ctx.response.body = { status: 200, msg: "更新文档成功", data: null };
});

// 文档下载
router.post("/task/md/download", async ctx => {
  let { id } = ctx.request.body;
  let queryStr = `select * from doc where isDel = 0 and id = ?`;
  let res = await query(queryStr, [id]);
  // mdToDoc
  util.mdToDoc(res[0].context, res[0].title, ctx);
});

// 正则
router.post("/task/regular/list", async ctx => {
  let res = [];
  let selectStr = `select * from regular where isDel = 0`;
  res = await query(selectStr);
  ctx.response.body = { status: 200, msg: "", data: res };
});

router.post("/task/regular/create", async ctx => {
  let params = ctx.request.body;
  let isExistItem = await query(
    `select uuid from regular where name = ? or expression = ?`,
    [params.name, params.expression]
  );
  if (isExistItem && isExistItem.length) {
    ctx.response.body = {
      status: 0,
      msg: "正则表达式匹配目的或者表达式重复,请用名称搜索使用",
      data: null
    };
    return;
  }
  let uuid = Uuid.v1();
  let createtime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
  let label = params.labels.join(",");
  let insertStr = `insert into regular values(?,?,?,?,?,?,?,?,?)`;
  res = await query(insertStr, [
    uuid,
    params.name,
    params.expression,
    params.test,
    params.type,
    label,
    createtime,
    params.creater || ctx.request.header.userName,
    0
  ]);
  ctx.response.body = { status: 200, msg: "创建正则表达式成功", data: null };
});

app.use(
  koaBody({
    multipart: true, // 支持文件上传
    formidable: {
      maxFieldsSize: 2 * 1024 * 1024, // 最大文件为2兆
      multipart: true // 是否支持 multipart-formdate 的表单
    }
  })
);

// app.use(bodyParser());
// 拦截器
app.use(
  KoaRouterInterceptor(router, async (ctx, next) => {
    let isLogin = false;
    // 登录界面直接放过
    if (ctx.path == "/task/login" || ctx.path == "/md/output.docx") {
      return true;
    }
    let queryStr = "select * from user where `id` = ?";
    res = await query(queryStr, [ctx.request.header.userid]);
    if (res && res.length) {
      let userInfo = res[0];
      // 共享角色登录不限制
      if (userInfo.role == "share") {
        ctx.request.header.userName = userInfo.name;
        isLogin = true;
      }
      // 已登录
      if (userInfo.token == ctx.request.header.token) {
        ctx.request.header.userName = userInfo.name;
        isLogin = true;
      }
    }
    if (!isLogin) {
      ctx.response.body = { status: 401, msg: "认证失败", data: null };
    }
    // 只有这个返回true，才会走koa-router配置的逻辑分发
    return isLogin;
  })
);

app.use(router.routes());

app.use(router.allowedMethods());

http.createServer(app.callback()).listen(4001);

console.log("Task server success to run.");
