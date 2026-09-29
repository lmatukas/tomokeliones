import {getPosition, getMoonIllumination} from 'suncalc';
// SunCalc 2 angles are degrees, azimuth clockwise from north. At (0,0),
// local up=+Z, north=+Y, east=+X in our Earth-fixed coordinates.
export function sunVector(date=new Date()){
 const position=getPosition(date,0,0);
 const azimuth=position.azimuth*Math.PI/180,altitude=position.altitude*Math.PI/180;
 return [Math.sin(azimuth)*Math.cos(altitude),Math.cos(azimuth)*Math.cos(altitude),Math.sin(altitude)];
}
export function moonState(date=new Date()){
 const {fraction,phase}=getMoonIllumination(date);
 const name=phase<.03||phase>.97?'Jaunatis':phase<.22?'Priešpilnis':phase<.28?'Pirmasis ketvirtis':phase<.47?'Augantis Mėnulis':phase<.53?'Pilnatis':phase<.72?'Dylantis Mėnulis':phase<.78?'Paskutinis ketvirtis':'Delčia';
 return {fraction,phase,name};
}
