# 订货小程序系统

基于 uni-app + uniCloud 的订货管理系统

## 登录注册说明

### 普通用户
- **注册方式**：仅支持微信注册 + 强制绑定手机号
- **登录方式**：微信一键登录
- **权限**：普通用户权限，可浏览商品、下单、积分兑换

### 管理员
- **登录方式**：账号密码登录
- **权限**：管理员权限，可管理商品、订单、兑换物品

## 部署步骤

1. 在 HBuilderX 中打开项目
2. 右键 `uniCloud-aliyun/cloudfunctions` 目录，上传所有云函数
3. 配置微信小程序 AppID（manifest.json）
4. 配置短信服务（uniCloud 控制台）
5. 运行到微信开发者工具

## 云函数说明

- `weixinLogin` - 微信登录
- `registerUser` - 用户注册（绑定手机号）
- `sendSmsCode` - 发送短信验证码
- `createOrder` - 创建订单
- `adminCompleteOrder` - 管理员完成订单
- `adminUpdateOrder` - 管理员修改订单
- 其他管理员云函数均需要管理员权限

## 注意事项

- 所有 admin 开头的云函数都有权限校验
- 注册用户默认为普通用户角色
- 管理员账号需要在数据库手动创建
