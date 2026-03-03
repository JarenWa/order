// page.config.js
module.exports = {
	pages: [
		// ========== 1. 分类管理 ==========
		{
			name: '分类管理',
			path: 'category',
			collection: 'opendb-mall-categories', // 对应数据库表名
			columns: [{
					label: '分类名称',
					prop: 'name',
					type: 'input',
					search: true
				},
				{
					label: '排序',
					prop: 'sort',
					type: 'number'
				},
				{
					label: '描述',
					prop: 'description',
					type: 'textarea'
				},
				{
					label: '创建时间',
					prop: 'create_date',
					type: 'date'
				}
			],
			list: ['name', 'sort', 'description', 'create_date'], // 列表显示的字段
			add: true,
			edit: true,
			del: true
		},

		// ========== 2. 商品管理 ==========
		{
			name: '商品管理',
			path: 'goods',
			collection: 'opendb-mall-goods',
			columns: [{
					label: '商品名称',
					prop: 'name',
					type: 'input',
					search: true
				},
				{
					label: '价格(分)',
					prop: 'goods_price',
					type: 'number'
				},
				{
					label: '库存',
					prop: 'remain_count',
					type: 'number'
				},
				{
					label: '规格',
					prop: 'standard',
					type: 'input'
				},


				{
					label: '分类',
					prop: 'category',
					type: 'select',
					options: 'opendb-mall-categories'
				}, // 关联分类表
				{
					label: '生产日期',
					prop: 'production_date',
					type: 'text' // 或 'date'，但 date 通常显示时分秒，这里简单文本即可
				},
				{
					label: '保质期(月)',
					prop: 'shelf_life_months',
					type: 'number'
				}


				{
					label: '缩略图',
					prop: 'goods_thumb',
					type: 'image'
				},
				{
					label: '轮播图',
					prop: 'goods_swiper_imgs',
					type: 'image',
					multiple: true
				},
				{
					label: '介绍图',
					prop: 'goods_introduce_imgs',
					type: 'image',
					multiple: true
				},
				{
					label: '简介',
					prop: 'goods_desc',
					type: 'textarea'
				},
				{
					label: '是否热销',
					prop: 'is_hot',
					type: 'switch',
					activeValue: true,
					inactiveValue: false
				},
				{
					label: '是否新品',
					prop: 'is_new',
					type: 'switch',
					activeValue: true,
					inactiveValue: false
				},
				{
					label: '是否上架',
					prop: 'is_on_sale',
					type: 'switch',
					activeValue: true,
					inactiveValue: false
				},
				{
					label: '标签',
					prop: 'tag',
					type: 'tags'
				},
				{
					label: '评论数',
					prop: 'comment_count',
					type: 'number'
				},
				{
					label: '销量',
					prop: 'total_sell_count',
					type: 'number'
				},
				{
					label: '创建时间',
					prop: 'add_date',
					type: 'date'
				},
				{
					label: '最后修改',
					prop: 'last_modify_date',
					type: 'date'
				}
			],
			list: ['name', 'goods_price', 'remain_count', 'category', 'is_on_sale', 'total_sell_count'],
			add: true,
			edit: true,
			del: true
		},

		// ========== 3. 订单管理 ==========
		{
			name: '订单管理',
			path: 'order',
			collection: 'uni-pay-orders',
			columns: [{
					label: '订单号',
					prop: '_id',
					type: 'input',
					search: true
				}, // _id 作为订单号
				{
					label: '用户ID',
					prop: 'user_id',
					type: 'input'
				},
				{
					label: '总金额(分)',
					prop: 'total_fee',
					type: 'number'
				},
				{
					label: '总件数',
					prop: 'total_count',
					type: 'number'
				},
				{
					label: '订单状态',
					prop: 'status',
					type: 'select',
					options: [{
							value: -2,
							label: '用户删除'
						},
						{
							value: -1,
							label: '已取消'
						},
						{
							value: 0,
							label: '待支付'
						},
						{
							value: 1,
							label: '待发货'
						},
						{
							value: 2,
							label: '待收货'
						},
						{
							value: 3,
							label: '待评价'
						},
						{
							value: 4,
							label: '已完成'
						}
					]
				},
				{
					label: '收货信息',
					prop: 'user_address',
					type: 'json'
				}, // 复杂对象以JSON展示
				{
					label: '购买商品',
					prop: 'buy_goods',
					type: 'json'
				},
				{
					label: '快递信息',
					prop: 'expressInfo',
					type: 'json'
				},
				{
					label: '支付单号',
					prop: 'transaction_id',
					type: 'input'
				},
				{
					label: '创建时间',
					prop: 'create_date',
					type: 'date'
				},
				{
					label: '支付时间',
					prop: 'pay_date',
					type: 'date'
				},
				{
					label: '发货时间',
					prop: 'deliver_date',
					type: 'date'
				},
				{
					label: '成交时间',
					prop: 'receive_date',
					type: 'date'
				},
				{
					label: '最后修改',
					prop: 'last_modify_date',
					type: 'date'
				}
			],
			list: ['_id', 'total_fee', 'status', 'create_date', 'user_id'],
			add: false, // 不允许后台新增订单
			edit: true, // 允许修改（如发货、改状态）
			del: false // 一般不删除订单
		}
	]
};