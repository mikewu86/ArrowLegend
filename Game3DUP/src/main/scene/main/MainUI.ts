import { ui } from "../../../ui/layaMaxUI";
import ShakeUtils from "../../../core/utils/ShakeUtils";
import GameBG from "../../../game/GameBG";
import DateUtils from "../../../core/utils/DateUtils";
import Game from "../../../game/Game";
import DisplayUtils, { MaskObj } from "../../../core/utils/DisplayUtils";
import FlyUpTips from "../../FlyUpTips";
import HomeData from "../../../game/data/HomeData";
import Session from "../../Session";
import SenderHttp from "../../../net/SenderHttp";
import App from "../../../core/App";
import SysHero from "../../sys/SysHero";
    export default class MainUI extends Laya.Box {
        private topUI:TopUI;
        private bottomUI:BottomUI;
        
        constructor(){
            super();
            this.height = GameBG.height;
            this.width = 750;

            this.topUI = new TopUI();
            this.addChild(this.topUI);

            this.bottomUI = new BottomUI();
            this.addChild(this.bottomUI);
            this.bottomUI.bottom = -2;

            let img:Laya.Image = new Laya.Image();
            img.skin = "main/jianhei.png";
            this.addChild(img);
            img.width = 800;
            img.anchorX = 0.5;
            img.y = this.bottomUI.y - 93;
            img.x = 375;

            this.addChild(this.bottomUI);

            this.mouseThrough = true;
        }

        public appEnergy():void
        {
            this.topUI.appEnergy();
        }

        public get selectIndex():number
        {
            return this.bottomUI.selectIndex;
        }
    }

    export class TopUI extends ui.test.mainUIUI
    {
        static TOTAL_TIME:number = 12 * 60;
        static MAX_ENERGY:number = 20;

        static xiaohao:number = 2;
        private _remainingTime:number = 0;

        private maskSpr:Laya.Sprite = new Laya.Sprite();
        // private mo:MaskObj;
        private homeData:HomeData;
        private _isInit:boolean = false;
        constructor(){
            super();
            this.timerClip.visible = false;
            this.appEnergyClip.visible = false;

            // this.mo = new MaskObj(this.jingyantiao);
            // this.mo.value = 0;

            this.headImg.skin = Game.userHeadUrl;
            this.nameTxt.text = Game.userName;

            // this.topBox.y = App.top;
            this.on(Laya.Event.DISPLAY,this,this.onDis);
        }

        private onDis():void
        {
            this.homeData = Session.homeData;
            if(Date.now() >= this.homeData.lastTime)
            {
                this._remainingTime = 0;
            }
            else
            {
                let deltaTime:number = Session.homeData.lastTime - Date.now();
                let time:number = Math.floor(deltaTime / 1000);
                this._remainingTime = Math.floor(time % TopUI.TOTAL_TIME);
                if(this._remainingTime == 0)
                {
                    this._remainingTime = TopUI.TOTAL_TIME;
                }
            }
            this.updateEnergy();

            this.dengji.value = "" + Session.homeData.level;

            this.coinClip.value = "" + Session.homeData.coins;

            let sys:SysHero = App.tableManager.getDataByNameAndId(SysHero.NAME,Session.homeData.level);
            let vv:number = Session.homeData.playerExp / sys.roleExp;
            Laya.timer.frameLoop(1,this,this.onLoopExp,[vv]);
        }

        private lastWidth:number = 0;
        private isTwo:boolean = false;
        private onLoopExp(vv:number):void
        {
            this.lastWidth += 15;
            if(this.isTwo)
            {
                if(this.lastWidth >= this.jingyantiao.width)
                {
                    this.lastWidth = 0;
                    this.isTwo = false;
                }
            }
            else
            {
                if(this.lastWidth >= this.jingyantiao.width * vv)
                {
                    this.lastWidth = this.jingyantiao.width * vv;
                    Laya.timer.clear(this,this.onLoopExp);
                }
            }
            this.lastWidth = Math.max(1,this.lastWidth);
            this.maskSpr.graphics.clear();
            this.maskSpr.graphics.drawRect(0,0,this.lastWidth ,this.jingyantiao.height,"#fff000");
            this.jingyantiao.mask = this.maskSpr;
        }

        /**扣除体力 */
        appEnergy():void
        {
            if(this.homeData.curEnergy < TopUI.xiaohao)
            {
                FlyUpTips.setTips("体力不足！");
                // return;
            }
            Game.isStartBattle = true;
            this.homeData.curEnergy -= TopUI.xiaohao;
            this.appEnergyClip.visible = true;
            this.appEnergyClip.value = "-" + TopUI.xiaohao;
            Laya.Tween.to(this.appEnergyClip,{y: 100},300,null,new Laya.Handler(this,this.onStart));
        }

        private onStart():void{
            this.appEnergyClip.visible = false;
            this.appEnergyClip.y = 47;
            

            this._remainingTime = TopUI.TOTAL_TIME;
            
            this.updateEnergy();

            this.homeData.lastTime = Date.now() + (this.homeData.totalEnergy - this.homeData.curEnergy) * TopUI.TOTAL_TIME * 1000;
            Session.saveData();

            Game.battleLoader.load();
        }

        /**更新精力*/
        private updateEnergy():void
        {
            this.tiliClip.value = this.homeData.curEnergy + "/" + this.homeData.maxEngergy;
            let value:number = this.homeData.curEnergy / this.homeData.maxEngergy;
            value = Math.max(0.1,value);

            // DisplayUtils.updateBlood(this.mo, value, 100);

            if(this.homeData.curEnergy < this.homeData.totalEnergy)
            {
                Laya.timer.clear(this,this.onLoop);
                Laya.timer.loop(1000,this,this.onLoop);
                this.onLoop();
            }
        }

        /**倒计时*/
        private onLoop():void
        {
            this.timerClip.visible = true;
            this.timerClip.value = DateUtils.getFormatBySecond3(this._remainingTime);
            this._remainingTime--;
            if(this._remainingTime < 0)
            {
                this.homeData.curEnergy++;
                if(this.homeData.curEnergy == this.homeData.totalEnergy)
                {
                    Laya.timer.clear(this,this.onLoop);
                    this.timerClip.visible = false;
                }
                else
                {
                    this._remainingTime = TopUI.TOTAL_TIME;
                }
                this.updateEnergy();
            }
        }
    }

    export class BottomUI extends Laya.Box
    {
        private bgBox:Laya.Box = new Laya.Box();
        private curBg:Laya.Image = new Laya.Image();
        private btnBox:Laya.Box = new Laya.Box();
        private bgs:Laya.Image[] = [];
        private btns:Laya.Button[] = [];

        private _selectIndex:number = 0;

        private opens:number[] = [1,-1,-1,-1,1];
        constructor(){
            super();
            this.size(750,122);
            this.addChild(this.bgBox);
            this.curBg.skin = 'main/dazhao.png';
            this.addChild(this.curBg);
            this.addChild(this.btnBox);
            for(let i = 0; i < 5; i++)
            {
                let bg:Laya.Image = new Laya.Image();
                bg.skin = 'main/xiaobiao.png';
                bg.width = 127;
                bg.height = 122;
                this.bgBox.addChild(bg);
                bg.x = i * bg.width;
                this.bgs.push(bg);
                let btn:Laya.Button = new Laya.Button();
                
                btn.tag = this.opens[i];
                if(this.opens[i] == 1)
                {
                    btn.stateNum = 2;
                    btn.width = 132;
                    btn.height = 136;
                    btn.skin = 'main/btn_' + i + '.png';
                    btn.y = bg.y + 40;
                }
                else{
                    btn.stateNum = 1;
                    btn.width = 38;
                    btn.height = 55;
                    btn.skin = 'main/suo.png';
                    btn.y = bg.y + 61;
                    btn.scale(1.2,1.2);
                }
                this.btnBox.addChild(btn);
                btn.anchorX = 0.5;
                btn.anchorY = 0.5;
                btn.x = bg.x + 63;
                btn.clickHandler = new Laya.Handler(this,this.onClick,[btn]);
                this.btns.push(btn);
            }
            this.onClick(this.btns[this._selectIndex],10);
        }

        private onClick(clickBtn:Laya.Button,delay:number = 500):void
        {
            if(clickBtn.tag == -1)
            {
                clickBtn.mouseEnabled = false;
                ShakeUtils.execute(clickBtn,300,2);
                setTimeout(() => {
                    clickBtn.mouseEnabled = true;
                }, 300);
                return;
            }
            var ww:number = 0;
            let tmp:Laya.Image;
            for(let i = 0; i < this.btns.length; i++)
            {
                let btn:Laya.Button = this.btns[i];
                let bg:Laya.Image = this.bgs[i];
                bg.width = 127;
                btn.selected = false;
                if(btn == clickBtn)
                {
                    btn.selected = true;
                    bg.skin = 'main/dabiao.png';
                    bg.width = 242;
                    this._selectIndex = i;
                    tmp = bg;
                }
                bg.x = ww;
                ww += bg.width;
                btn.x = bg.x + bg.width * 0.5;
            }
            Laya.Tween.to(this.curBg,{x:tmp.x},delay,Laya.Ease.cubicInOut);
            Laya.stage.event("switchView");
        }

        public get selectIndex():number
        {
            return this._selectIndex;
        }
    }