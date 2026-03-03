<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validate-trigger="submit" err-show-type="toast">
      <uni-forms-item name="provider" label="支付供应商">
        <uni-data-checkbox v-model="formData.provider" :localdata="formOptions.provider_localdata"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="provider_pay_type" label="支付方式">
        <uni-easyinput placeholder="支付供应商的支付类型（插件内部标记支付类型的标识，不需要用户传）" v-model="formData.provider_pay_type" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="uni_platform" label="应用平台">
        <uni-easyinput placeholder="uni客户端平台,如：web、mp-weixin、mp-alipay、app等" v-model="formData.uni_platform" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="status" label="订单状态">
        <uni-data-checkbox v-model="formData.status" :localdata="formOptions.status_localdata"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="type" label="订单类型">
        <uni-easyinput placeholder="订单类型 goods：订单付款 recharge：余额充值付款 vip：vip充值付款 等等，可自定义" v-model="formData.type" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="order_no" label="业务系统订单号">
        <uni-easyinput placeholder="业务系统订单号，控制在20-28位（不可以是24位,24位在阿里云空间可能会有问题，可重复，代表1个业务订单会有多次付款的情况）" v-model="formData.order_no" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="out_trade_no" label="支付插件订单号">
        <uni-easyinput placeholder="支付插件订单号（需控制唯一，不传则由插件自动生成）" v-model="formData.out_trade_no" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="transaction_id" label="交易单号">
        <uni-easyinput placeholder="交易单号（支付平台订单号，由支付平台控制唯一）" v-model="formData.transaction_id" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="user_id" label="用户ID">
        <uni-easyinput placeholder="用户id，参考uni-id-users表" v-model="formData.user_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="nickname" label="用户昵称">
        <uni-easyinput placeholder="用户昵称冗余" v-model="formData.nickname" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="device_id" label="">
        <uni-easyinput placeholder="客户端设备ID" v-model="formData.device_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="client_ip" label="客户端IP">
        <uni-easyinput placeholder="创建支付的客户端ip" v-model="formData.client_ip" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="openid" label="openid">
        <uni-easyinput placeholder="发起支付的用户openid" v-model="formData.openid" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="description" label="支付描述">
        <uni-easyinput placeholder="支付描述，如：uniCloud个人版包月套餐" v-model="formData.description" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="err_msg" label="支付失败原因">
        <uni-easyinput placeholder="支付失败原因" v-model="formData.err_msg" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="total_fee" label="订单总金额">
        <uni-easyinput placeholder="订单总金额，单位为分，100等于1元" type="number" v-model="formData.total_fee"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="refund_fee" label="订单总退款金额">
        <uni-easyinput placeholder="订单总退款金额，单位为分，100等于1元" type="number" v-model="formData.refund_fee"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="refund_count" label="当前退款笔数">
        <uni-easyinput placeholder="当前退款笔数 (退款单号为 out_trade_no-refund_count)" type="number" v-model="formData.refund_count"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="refund_list" label="退款详情">
        <uni-data-checkbox :multiple="true" v-model="formData.refund_list"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="provider_appid" label="开放平台appid">
        <uni-easyinput placeholder="公众号appid，小程序appid，app开放平台appid 等" v-model="formData.provider_appid" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="appid" label="DCloud AppId">
        <uni-easyinput placeholder="dcloud_appid" v-model="formData.appid" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="user_order_success" label="回调状态">
        <switch @change="binddata('user_order_success', $event.detail.value)" :checked="formData.user_order_success"></switch>
      </uni-forms-item>
      <uni-forms-item name="pay_date" label="支付时间">
        <uni-datetime-picker return-type="timestamp" v-model="formData.pay_date"></uni-datetime-picker>
      </uni-forms-item>
      <uni-forms-item name="notify_date" label="异步通知时间">
        <uni-datetime-picker return-type="timestamp" v-model="formData.notify_date"></uni-datetime-picker>
      </uni-forms-item>
      <uni-forms-item name="cancel_date" label="取消时间">
        <uni-datetime-picker return-type="timestamp" v-model="formData.cancel_date"></uni-datetime-picker>
      </uni-forms-item>
      <uni-forms-item name="refund_date" label="最近退款时间">
        <uni-datetime-picker return-type="timestamp" v-model="formData.refund_date"></uni-datetime-picker>
      </uni-forms-item>
      <view class="uni-button-group">
        <button type="primary" class="uni-button" @click="submit">提交</button>
      </view>
    </uni-forms>
  </view>
</template>

<script>
  import { validator } from '../../../js_sdk/validator/uni-pay-orders.js';

  const db = uniCloud.database();
  const dbCollectionName = 'uni-pay-orders';

  function getValidator(fields) {
    let result = {}
    for (let key in validator) {
      if (fields.indexOf(key) > -1) {
        result[key] = validator[key]
      }
    }
    return result
  }

  

  export default {
    data() {
      let formData = {
        "provider": "",
        "provider_pay_type": "",
        "uni_platform": "",
        "status": 0,
        "type": "",
        "order_no": "",
        "out_trade_no": "",
        "transaction_id": "",
        "user_id": "",
        "nickname": "",
        "device_id": "",
        "client_ip": "",
        "openid": "",
        "description": "",
        "err_msg": "",
        "total_fee": null,
        "refund_fee": null,
        "refund_count": null,
        "refund_list": [],
        "provider_appid": "",
        "appid": "",
        "user_order_success": null,
        "pay_date": null,
        "notify_date": null,
        "cancel_date": null,
        "refund_date": null
      }
      return {
        formData,
        formOptions: {
          "provider_localdata": [
            {
              "text": "微信支付",
              "value": "wxpay"
            },
            {
              "text": "支付宝",
              "value": "alipay"
            },
            {
              "text": "苹果应用内支付",
              "value": "appleiap"
            }
          ],
          "status_localdata": [
            {
              "text": "已关闭",
              "value": -1
            },
            {
              "text": "未支付",
              "value": 0
            },
            {
              "text": "已支付",
              "value": 1
            },
            {
              "text": "已部分退款",
              "value": 2
            },
            {
              "text": "已全额退款",
              "value": 3
            }
          ]
        },
        rules: {
          ...getValidator(Object.keys(formData))
        }
      }
    },
    onReady() {
      this.$refs.form.setRules(this.rules)
    },
    methods: {
      
      /**
       * 验证表单并提交
       */
      submit() {
        uni.showLoading({
          mask: true
        })
        this.$refs.form.validate().then((res) => {
          return this.submitForm(res)
        }).catch(() => {
        }).finally(() => {
          uni.hideLoading()
        })
      },

      /**
       * 提交表单
       */
      submitForm(value) {
        // 使用 clientDB 提交数据
        return db.collection(dbCollectionName).add(value).then((res) => {
          uni.showToast({
            icon: 'none',
            title: '新增成功'
          })
          this.getOpenerEventChannel().emit('refreshData')
          setTimeout(() => uni.navigateBack(), 500)
        }).catch((err) => {
          uni.showModal({
            content: err.message || '请求服务失败',
            showCancel: false
          })
        })
      }
    }
  }
</script>

<style>
  .uni-container {
    padding: 15px;
  }

  .uni-input-border,
  .uni-textarea-border {
    width: 100%;
    font-size: 14px;
    color: #666;
    border: 1px #e5e5e5 solid;
    border-radius: 5px;
    box-sizing: border-box;
  }

  .uni-input-border {
    padding: 0 10px;
    height: 35px;

  }

  .uni-textarea-border {
    padding: 10px;
    height: 80px;
  }

  .uni-button-group {
    margin-top: 50px;
    /* #ifndef APP-NVUE */
    display: flex;
    /* #endif */
    justify-content: center;
  }

  .uni-button {
    width: 184px;
  }
</style>
