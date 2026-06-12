import sys

def patch_game_js():
    with open('game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update HERO_TMPL
    darkpriest_target = """    DARKPRIEST: {
        name:"암흑사제", color:"#7c3aed",
        hp:1950, atk:35, aspd:1.3, move:155, range:380, type:"ranged", role_desc:"[원거리 / 서포터 / 디버퍼]",
        skill1: { name:"영혼 착취", cd:10, desc:"주변 아군 한 명의 체력을 일부 깎는 대신, 적에게 2.5배 강력한 레이저 공격을 뿜어냅니다." },
        skill2: { name:"저주의 낙인", cd:14, desc:"대상 적에게 10초간 낙인 부여. 아군의 모든 공격이 대상에게 30% 추가 피해" },
        draw:(ctx,x,y,r,dir,f,anim) => drawBlockyHero(ctx,x,y,r,dir,f,'darkpriest',anim)
    }"""
    
    new_heroes = """    DARKPRIEST: {
        name:"암흑사제", color:"#7c3aed",
        hp:1950, atk:35, aspd:1.3, move:155, range:380, type:"ranged", role_desc:"[원거리 / 서포터 / 디버퍼]",
        skill1: { name:"영혼 착취", cd:10, desc:"주변 아군 한 명의 체력을 일부 깎는 대신, 적에게 2.5배 강력한 레이저 공격을 뿜어냅니다." },
        skill2: { name:"저주의 낙인", cd:14, desc:"대상 적에게 10초간 낙인 부여. 아군의 모든 공격이 대상에게 30% 추가 피해" },
        draw:(ctx,x,y,r,dir,f,anim) => drawBlockyHero(ctx,x,y,r,dir,f,'darkpriest',anim)
    },
    ZEROS: {
        name:"제로스", color:"#7f1d1d",
        hp:2500, atk:65, aspd:1.4, move:185, range:120, type:"melee", role_desc:"[마검사 / 암살자 / 광역 딜러]",
        skill1: { name:"흑염참", cd:8, desc:"전방 부채꼴 범위의 적에게 데미지를 주고 이속 50% 감소 및 시야가려짐(블라인드) 부여" },
        skill2: { name:"그림자 습격", cd:14, desc:"멀리 있는 적에게 순간이동 후 치명타. 주변 적 1.5초 공포" },
        draw:(ctx,x,y,r,dir,f,anim,ent) => drawBlockyHero(ctx,x,y,r,dir,f,'zeros',anim,ent)
    },
    SYLVIA: {
        name:"실비아", color:"#2dd4bf",
        hp:1600, atk:90, aspd:0.6, move:165, range:300, type:"ranged", role_desc:"[초장거리 스나이퍼 / 퓨어 딜러]",
        critChance:0.2,
        skill1: { name:"관통하는 섬광", cd:10, desc:"1초 정신집중 후 전방 일직선 두꺼운 트루데미지 레이저 발사" },
        skill2: { name:"전술 회피", cd:15, desc:"발밑에 지뢰를 깔고 뒤로 크게 백대쉬. 지뢰 폭발 시 적 2초 기절" },
        draw:(ctx,x,y,r,dir,f,anim,ent) => drawBlockyHero(ctx,x,y,r,dir,f,'sylvia',anim,ent)
    },
    ZEPHYR: {
        name:"제피르", color:"#4ade80",
        hp:1800, atk:40, aspd:1.6, move:175, range:200, type:"ranged", role_desc:"[바람 마법사 / 다단히트 DPS]",
        skill1: { name:"Tornado Blast", cd:9, desc:"주변으로 소형 회오리 여러 개가 팽창하며 적 다단히트 및 넉백" },
        skill2: { name:"Gale Squall", cd:16, desc:"거대하고 느린 폭풍을 발사하여 닿은 적 에어본 및 둔화" },
        draw:(ctx,x,y,r,dir,f,anim,ent) => drawBlockyHero(ctx,x,y,r,dir,f,'zephyr',anim,ent)
    }"""
    
    if darkpriest_target in content:
        content = content.replace(darkpriest_target, new_heroes)
        print("Inserted new heroes into HERO_TMPL.")
    else:
        print("Could not find DARKPRIEST in HERO_TMPL")

    with open('game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    patch_game_js()
