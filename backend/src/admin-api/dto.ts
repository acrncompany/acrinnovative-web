/**
 * Validation classes (class-validator) for every admin resource.
 * "Create" classes list required fields; "Update" classes are the same with everything optional (PartialType).
 * Unknown fields are stripped by the ValidationPipe (whitelist).
 */
import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator';
import { BlockType, FeatureGroup, MenuLocation, StatGroup, Status } from '@prisma/client';

// ---- small reusable decorators
/** Surrounding spaces are removed before validation, so "   " counts as empty. */
const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
const Required = (max: number) => applyDecorators(Trim(), IsString(), IsNotEmpty(), MaxLength(max));
const Optional = (max: number) => applyDecorators(Trim(), IsOptional(), IsString(), MaxLength(max));
const OptionalInt = () => applyDecorators(IsOptional(), IsInt(), Min(0));
const OptionalBool = () => applyDecorators(IsOptional(), IsBoolean());
/** Only relative links, http(s), mailto: and tel: (blocks javascript: URLs). */
const LinkUrl = () => applyDecorators(IsString(), MaxLength(300), Matches(/^(\/|#|https?:\/\/|mailto:|tel:)/, { message: 'must be a link such as /contact or https://...' }));
const OptionalLink = () => applyDecorators(IsOptional(), LinkUrl());
const FaIcon = () => applyDecorators(IsOptional(), IsString(), MaxLength(80), Matches(/^[a-z0-9 -]*$/i, { message: 'icon must be a Font Awesome class such as "fas fa-building"' }));
const MediaRef = () => applyDecorators(IsOptional(), IsInt(), Min(1)); // id of a Media row (null clears it)

class SeoFields {
  @Optional(200) metaTitle?: string;
  @Optional(400) metaDescription?: string;
  @MediaRef() ogImageId?: number;
}

// ---- offices, social, menu
export class OfficeDto {
  @Required(200) name: string;
  @Required(100) shortName: string;
  @Required(1000) addressLines: string;
  @Optional(1000) contactAddressLines?: string;
  @Required(100) city: string;
  @Optional(100) region?: string;
  @Optional(20) postalCode?: string;
  @IsString() @Matches(/^[A-Z]{2}$/, { message: 'countryCode must be 2 capital letters, e.g. IN' }) countryCode: string;
  @Required(100) country: string;
  @Required(300) streetAddress: string;
  @Required(50) phone: string;
  @IsString() @Matches(/^\+?[0-9]{6,20}$/, { message: 'phoneRaw must be digits with an optional leading +, e.g. +919447157549' }) phoneRaw: string;
  @IsOptional() @IsEmail() @MaxLength(200) email?: string;
  @OptionalBool() isHeadOffice?: boolean;
  @OptionalInt() sortOrder?: number;
}
export class UpdateOfficeDto extends PartialType(OfficeDto) {}

export class SocialLinkDto {
  @Required(50) platform: string;
  @IsString() @MaxLength(500) @Matches(/^https?:\/\//, { message: 'url must start with http:// or https://' }) url: string;
  @OptionalBool() visible?: boolean;
  @OptionalInt() sortOrder?: number;
}
export class UpdateSocialLinkDto extends PartialType(SocialLinkDto) {}

export class MenuItemDto {
  @IsEnum(MenuLocation) location: MenuLocation;
  @Required(100) label: string;
  @LinkUrl() url: string;
  @OptionalBool() visible?: boolean;
  @OptionalInt() sortOrder?: number;
}
export class UpdateMenuItemDto extends PartialType(MenuItemDto) {}

// ---- fixed pages and their content blocks (edit only)
export class UpdatePageDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @Optional(200) metaTitle?: string;
  @Optional(400) metaDescription?: string;
  @MediaRef() ogImageId?: number;
}

export class UpdateBlockDto {
  @IsOptional() @IsString() @MaxLength(100000) value?: string;
  @MediaRef() mediaId?: number;
}

// ---- home page repeaters
export class HeroSlideDto {
  @Required(300) heading: string;
  @Optional(200) accentText?: string;
  @Required(500) lead: string;
  @Required(1000) body: string;
  @MediaRef() imageId?: number;
  @Optional(100) cta1Label?: string;
  @OptionalLink() cta1Url?: string;
  @Optional(100) cta2Label?: string;
  @OptionalLink() cta2Url?: string;
  @IsOptional() @IsEnum(Status) status?: Status;
  @OptionalInt() sortOrder?: number;
}
export class UpdateHeroSlideDto extends PartialType(HeroSlideDto) {}

export class StatDto {
  @IsEnum(StatGroup) group: StatGroup;
  @Required(150) label: string;
  @IsOptional() @IsInt() @Min(0) @Max(100000000) value?: number;
  @IsOptional() @IsString() @MaxLength(10) suffix?: string;
  @Optional(100) textValue?: string;
  @Optional(1000) description?: string;
  @MediaRef() iconId?: number;
  @IsOptional() @IsEnum(Status) status?: Status;
  @OptionalInt() sortOrder?: number;
}
export class UpdateStatDto extends PartialType(StatDto) {}

export class FeatureItemDto {
  @IsEnum(FeatureGroup) group: FeatureGroup;
  @FaIcon() icon?: string;
  @Required(200) title: string;
  @Optional(200) subtitle?: string;
  @IsString() @MaxLength(2000) body: string;
  @IsOptional() @IsEnum(Status) status?: Status;
  @OptionalInt() sortOrder?: number;
}
export class UpdateFeatureItemDto extends PartialType(FeatureItemDto) {}

export class TeamMemberDto {
  @Required(150) name: string;
  @Required(200) role: string;
  @Required(5000) bio: string;
  @FaIcon() icon?: string;
  @MediaRef() photoId?: number;
  @IsOptional() @IsEnum(Status) status?: Status;
  @OptionalInt() sortOrder?: number;
}
export class UpdateTeamMemberDto extends PartialType(TeamMemberDto) {}

// ---- services
export class ServiceCategoryDto {
  @Required(150) title: string;
  @Optional(160) slug?: string;
  @OptionalInt() sortOrder?: number;
}
export class UpdateServiceCategoryDto extends PartialType(ServiceCategoryDto) {}

export class ServiceDto extends SeoFields {
  @IsInt() @Min(1) categoryId: number;
  @Required(200) title: string;
  @Optional(220) slug?: string;
  @FaIcon() icon?: string;
  @Required(2000) summary: string;
  @Optional(2000) homeSummary?: string;
  @OptionalInt() homeSortOrder?: number;
  @IsString() @MaxLength(200000) body: string;
  @OptionalBool() showOnHome?: boolean;
  @IsOptional() @IsEnum(Status) status?: Status;
  @OptionalInt() sortOrder?: number;
}
export class UpdateServiceDto extends PartialType(ServiceDto) {}

// ---- insights
export class PostCategoryDto {
  @Required(100) name: string;
  @Optional(120) slug?: string;
  @OptionalInt() sortOrder?: number;
}
export class UpdatePostCategoryDto extends PartialType(PostCategoryDto) {}

export class PostDto extends SeoFields {
  @IsInt() @Min(1) categoryId: number;
  @Required(250) title: string;
  @Optional(270) slug?: string;
  @Required(5000) excerpt: string;
  @Optional(2000) homeSummary?: string;
  @IsString() @MaxLength(500000) body: string;
  @MediaRef() coverId?: number;
  @Required(150) authorName: string;
  @IsOptional() @IsEnum(Status) status?: Status;
  @IsOptional() @IsDateString() publishedAt?: string;
  @OptionalBool() showOnHome?: boolean;
  @OptionalInt() sortOrder?: number;
}
export class UpdatePostDto extends PartialType(PostDto) {}

// ---- careers
export class JobDto extends SeoFields {
  @Required(200) title: string;
  @Optional(220) slug?: string;
  @Required(150) location: string;
  @Required(80) employmentType: string;
  @Optional(120) department?: string;
  @IsString() @MaxLength(200000) description: string;
  @IsOptional() @IsEnum(Status) status?: Status;
  @IsOptional() @IsDateString() closingDate?: string;
  @OptionalInt() sortOrder?: number;
}
export class UpdateJobDto extends PartialType(JobDto) {}

// ---- inbox
export class MarkReadDto {
  @IsBoolean() isRead: boolean;
}

/** "Delete everything older than N months" (inbox clean-up). */
export class PurgeDto {
  @IsInt() @Min(1, { message: 'Choose at least 1 month.' }) @Max(120, { message: 'Choose 120 months or fewer.' }) months: number;
}

// ---- site settings
export class UpdateSettingsDto {
  @IsOptional() @Required(200) siteName?: string;
  @IsOptional() @Required(200) brandName?: string;
  @IsOptional() @Required(200) brandSub?: string;
  @IsOptional() @Required(250) legalName?: string;
  @IsOptional() @Required(300) tagline?: string;
  @MediaRef() logoId?: number;
  @MediaRef() footerLogoId?: number;
  /** Changing this regenerates favicon.ico, apple-touch-icon and the manifest icons automatically. */
  @MediaRef() faviconId?: number;
  @IsOptional() @IsEmail() @MaxLength(200) contactEmail?: string;
  @IsOptional() @IsEmail() @MaxLength(200) notificationEmail?: string;
  @IsOptional() @Required(1000) footerText?: string;
  @IsOptional() @Required(100) headerButtonLabel?: string;
  @IsOptional() @LinkUrl() headerButtonUrl?: string;
  @IsOptional() @Required(200) defaultMetaTitleSuffix?: string;
  @IsOptional() @Required(400) defaultMetaDescription?: string;
  @MediaRef() defaultOgImageId?: number;
  @IsOptional() @IsString() @MaxLength(500) keywords?: string;
  @IsOptional() @Required(200) author?: string;
  @IsOptional() @IsString() @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'themeColor must look like #C89B42' }) themeColor?: string;
  @IsOptional() @IsString() @MaxLength(10) foundingYear?: string;
  @IsOptional() @IsString() @MaxLength(500) orgDescription?: string;
}

// ---- media
export class MediaAltDto {
  @Trim() @IsString() @IsNotEmpty({ message: 'Alt text (a short description of the image) is required' }) @MaxLength(300) alt: string;
}

// ---- SEO preview
export class SeoPreviewDto {
  @IsEnum(['page', 'service', 'post', 'job'] as const) kind: 'page' | 'service' | 'post' | 'job';
  /** For kind=page: home, about, ... */
  @IsOptional() @IsString() @MaxLength(50) pageKey?: string;
  @IsOptional() @IsString() @MaxLength(250) title?: string;
  @IsOptional() @IsString() @MaxLength(200) metaTitle?: string;
  @IsOptional() @IsString() @MaxLength(400) metaDescription?: string;
  @IsOptional() @IsString() @MaxLength(270) slug?: string;
  /** Text used as the description fallback (summary / excerpt). */
  @IsOptional() @IsString() @MaxLength(200000) text?: string;
}

export { BlockType };
