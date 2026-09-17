

const seed = {
  updatedAt: new Date().toISOString(),
  days: [
    {date:'2026-09-18', label:'יום שישי', tasks:[
      {id:'fri-0830',time:'08:30',title:'פתיחת יום ותכנון קצר',kind:'focus',done:false},
      {id:'fri-0900',time:'09:00',title:'מעקב לידים ולקוחות',kind:'work',done:false},
      {id:'fri-1030',time:'10:30',title:'קידום גיוס 19 סוכנים',kind:'growth',done:false},
      {id:'fri-1200',time:'12:00',title:'סיכום שבוע והכנה לשבת',kind:'admin',done:false}
    ]},
    {date:'2026-09-19',label:'שבת',tasks:[{id:'sat-2030',time:'20:30',title:'בניית לו״ז שבועי יחד',kind:'focus',done:false}]},
    {date:'2026-09-20',label:'יום ראשון',tasks:[
      {id:'sun-0830',time:'08:30',title:'לו״ז יומי וסדר עדיפויות',kind:'focus',done:false},
      {id:'sun-0930',time:'09:30',title:'פניות חדשות ומעקב לקוחות',kind:'work',done:false},
      {id:'sun-1100',time:'11:00',title:'סבב גיוס סוכנים',kind:'growth',done:false},
      {id:'sun-1400',time:'14:00',title:'יפן 2027 - הרשמות ומעקב',kind:'travel',done:false},
      {id:'sun-1700',time:'17:00',title:'Travel Bot - הכנה להשקה',kind:'tech',done:false}
    ]},
    {date:'2026-09-21',label:'יום שני',tasks:[{id:'mon-0830',time:'08:30',title:'לו״ז יומי',kind:'focus',done:false},{id:'mon-1000',time:'10:00',title:'יצירת תוכן לטיקטוק',kind:'growth',done:false}]},
    {date:'2026-09-22',label:'יום שלישי',tasks:[{id:'tue-0830',time:'08:30',title:'לו״ז יומי',kind:'focus',done:false},{id:'tue-1100',time:'11:00',title:'לקוחות ומכירות',kind:'work',done:false}]},
    {date:'2026-09-23',label:'יום רביעי',tasks:[{id:'wed-0830',time:'08:30',title:'לו״ז יומי',kind:'focus',done:false},{id:'wed-1200',time:'12:00',title:'מעקב יעדים שבועי',kind:'admin',done:false}]},
    {date:'2026-09-24',label:'יום חמישי',tasks:[{id:'thu-0830',time:'08:30',title:'לו״ז יומי',kind:'focus',done:false},{id:'thu-1500',time:'15:00',title:'סגירת קצוות לשבוע',kind:'admin',done:false}]}
  ],
  goals: [
    {id:'agents',icon:'🤝',title:'גיוס סוכנים',current:0,target:19,unit:'סוכנים',color:'#7256ff'},
    {id:'tiktok',icon:'🎬',title:'צפיות בטיקטוק',current:146,target:10000,unit:'צפיות',color:'#ff5b7f'},
    {id:'japan',icon:'🗾',title:'יפן 2027',current:0,target:20,unit:'נרשמים',color:'#e59a2f'},
    {id:'bot',icon:'🤖',title:'השקת Travel Bot',current:2,target:4,unit:'שלבים',color:'#38c99e'}
  ]
};

export default async function handler(req,res){
  return res.status(200).json({...seed,demo:true});
}
export { seed };
