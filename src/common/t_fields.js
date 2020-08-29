export default {
  list: {
    name: "任务列表",
    tableColumns: [
      {
        prop: "name",
        label: "任务",
        operateFun: { function: "info" },
      },
      {
        prop: "owner",
        label: "所有者"
      },
      {
        prop: "status",
        label: "状态",
        renderPage: "status",
        width: "120"
      },
      {
        prop: "label",
        label: "标签"
      },
      { prop: "startTime", label: "开始时间" },
      { prop: "endTime", label: "到期时间", renderPage: "endTime" },
      {
        prop: "estimatedTime",
        label: "预期时间",
        width: "110",
        renderPage: "estimatedTime"
      },
      {
        prop: "overtime",
        label: "剩余/超时时间",
        renderPage: "overtime",
        width: "120"
      },
      {
        prop: "priority",
        label: "优先级",
        renderPage: "priority",
        width: "90"
      },
      { prop: "creator", label: "创建者", width: "90" },
      { prop: "finished", label: "%已完成", renderPage: "progress" },
      {
        prop: "operate",
        label: "操作",
        width: "140",
        operateFun: [
          {
            label: "编辑",
            function: "edit",
            icon: "el-icon-edit"
          },
          {
            label: "删除",
            function: "del",
            icon: "el-icon-delete"
          }
        ]
      }
    ]
  },
  user: {
    name: "任务列表",
    tableColumns: [
      {
        prop: "name",
        label: "姓名"
      },
      {
        prop: "key",
        label: "Code"
      },
      {
        prop: "department",
        label: "部门"
      },
      {
        prop: "group",
        label: "组"
      },
      {
        prop: "team",
        label: "团队"
      },
      {
        prop: "remark",
        label: "备注"
      },
      {
        prop: "operate",
        label: "操作",
        width: "220",
        operateFun: [
          {
            label: "删除",
            function: "del",
            icon: "el-icon-delete"
          }
        ]
      }
    ]
  }
};