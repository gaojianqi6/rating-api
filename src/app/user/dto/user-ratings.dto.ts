import { ApiProperty } from '@nestjs/swagger';

export class RatingItemDto {
  @ApiProperty({ description: 'The ID of the item' })
  id: number;

  @ApiProperty({ description: 'The title of the item' })
  title: string;

  @ApiProperty({ description: 'The slug of the item' })
  slug: string;

  @ApiProperty({ description: 'The release year of the item' })
  year: number;

  @ApiProperty({ description: 'The poster URL of the item' })
  poster: string;

  @ApiProperty({ description: 'The rating score given by the user' })
  rating: number;

  @ApiProperty({ description: 'The comment provided by the user' })
  comment: string;
}
