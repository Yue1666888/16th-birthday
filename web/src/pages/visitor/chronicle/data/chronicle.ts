/** Curated from SIPC相关信息统计.md, 发展历史 only. Dates keep the source's precision. */
export interface ChronicleEvent {
  id: string
  year: number
  period?: string
  dateTime?: string
  title: string
  details: string[]
  highlights?: string[]
}
export const chronicleEvents: ChronicleEvent[] = [
  {
    id: '2009-09',
    year: 2009,
    period: '9月',
    dateTime: '2009-09',
    title: '从 602 出发',
    details: ['602工作室成立。', '下设管理部、技术部、项目部、运维部。'],
  },
  {
    id: '2010-spring',
    year: 2010,
    period: '春',
    title: '技术方向，初具雏形',
    details: ['Java组、C#组、PHP组、运维组、ACM集训队成立。'],
  },
  {
    id: '2010-autumn',
    year: 2010,
    period: '秋',
    title: '115，故事的新坐标',
    details: ['115工作室成立。'],
  },
  {
    id: '2010-12-10',
    year: 2010,
    period: '12月10日',
    dateTime: '2010-12-10',
    title: '一个新的名字：SIPC',
    details: [
      '正式更名为学生创新实践中心。',
      'Student Innovation and Practice Center（SIPC）。',
    ],
  },
  {
    id: '2011-09',
    year: 2011,
    period: '9月',
    dateTime: '2011-09',
    title: '纳新与培训，接力生长',
    details: ['科技协会交由中心管理负责，开始纳新培训。'],
  },
  { id: '2016', year: 2016, title: '安全组成立', details: ['安全组成立。'] },
  {
    id: '2018',
    year: 2018,
    title: '后端与机器学习',
    details: ['后端组、机器学习组成立。'],
    highlights: ['OJ 平台'],
  },
  { id: '2019', year: 2019, title: '产品组成立', details: ['产品组成立。'] },
  {
    id: '2020',
    year: 2020,
    title: '协作，走向新的连接',
    details: ['115开始以飞书平台进行组织构建、多人协作，以及文档与成员管理。'],
  },
  {
    id: '2021',
    year: 2021,
    title: '更多方向，更多可能',
    details: [
      '游戏组、iOS组成立。',
      'OJ平台进入规范化运营和维护阶段。',
      '迎新小游戏上线，TUTCTF上线。',
      '安全组正式增加密码学方向。',
    ],
  },
  { id: '2023', year: 2023, title: '物联组成立', details: ['物联组成立。'] },
  {
    id: '2025',
    year: 2025,
    title: '空间与团队，再次拓展',
    details: ['114工作室并入使用。', '客户端组成立。'],
  },
  {
    id: '2026',
    year: 2026,
    title: '在新的组织中继续前进',
    details: ['前端、后端、客户端合并为开发组。', '物联组改名为嵌入式组。'],
  },
]
