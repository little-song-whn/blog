---
title: 当 VLA 模型学会"想象未来"
subtitle: 关于 World Model 在具身智能中的一点思考
date: 2026-04-15
tags: [强化学习, World Model, VLA, 笔记]
slug: world-model-vla
---

在具身智能里,有一个很朴素的问题始终绕不开:**机器人在执行长序列动作之前,能不能在脑子里先"过一遍"?**

这听起来像是科幻,但其实就是 World Model 的核心思想:让模型学会预测"如果我做了 $a_t$,下一个观测 $o_{t+1}$ 会长什么样"。

## 形式化一下

一个 World Model 通常被建模为这样的条件分布:

$$
p_\theta(o_{t+1} \mid o_{\le t}, a_{\le t})
$$

而当我们把它和 VLA(Vision-Language-Action)模型结合起来时,事情变得有趣 —— 因为语言指令 $\ell$ 也参与其中:

$$
\pi_\phi(a_t \mid o_{\le t}, \ell), \quad p_\theta(o_{t+1} \mid o_{\le t}, a_{\le t}, \ell)
$$

也就是说,模型不仅在"看",还在"听",并基于二者一起想象。

## 为什么它对 RL 友好

经典 RL 的痛点之一是 **sample efficiency**。每一次试错都要在真实环境里跑一遍,成本极高 —— 尤其当"环境"是一台真实机器人。

World Model 提供了一个绕开这个问题的优雅方案:**在 latent space 里 rollout**。我们不需要真的让机器人去抓杯子失败十万次,我们让世界模型"想象"它失败十万次就够了。

```python
# 伪代码:在 world model 中做 imagination rollout
state = encoder(obs)
for t in range(horizon):
    action = policy(state, instruction)
    state = world_model.step(state, action)  # 不接触真实环境
    reward = reward_head(state)
    update_policy(state, action, reward)
```

当然,这里隐藏着一个永恒的问题:**模型自己想象出来的世界,真的等于真实世界吗?**

## 那些"想象"会走偏的地方

几个我自己反复踩过坑的地方:

- **Compounding error**:rollout 越长,每一步的微小误差被指数级放大。第 50 步的画面可能已经"做梦"了。
- **Out-of-distribution actions**:策略学着学着,可能开始偏好那些"在想象里收益高,但其实模型从来没真见过"的动作。
- **奖励黑客**:模型不仅学环境,还学奖励 —— 而学到的奖励函数往往比真实奖励更"容易被骗"。

## 一些朴素的思路

针对上面三个问题,目前我看到比较有意思的做法:

1. 限制想象的 horizon,**短想象 + 真实世界校准**。
2. 用 uncertainty estimate 给每一步打折扣,**模型不确定的地方就少信它一点**。
3. 把奖励建模和动力学建模解耦,**reward head 单独训练并 regularize**。

---

这些想法都还很粗糙,但我越来越觉得 —— 在具身智能这个领域里,**"如何让模型既敢想象,又不至于被自己骗到"** 也许是接下来几年最有意思的问题之一。

下一篇打算具体写写 Anticipation-VLA 里我们是怎么处理这个 trade-off 的,敬请期待。
